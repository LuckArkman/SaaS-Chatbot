from sqlalchemy.orm import Session
from datetime import datetime
from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
from src.services.whatsapp_bridge_service import whatsapp_bridge
from src.core.tenancy import get_current_tenant_id
from src.core.ws import ws_manager
from loguru import logger
from typing import List, Optional

class WhatsAppManagerService:
    """
    Controlador de Negocio para instancias de WhatsApp no Tenant.
    Substitui o 'BotOrchestrator' do .NET.
    """
    @staticmethod
    def get_or_create_instance(db: Session, tenant_id: str) -> WhatsAppInstance:
        """Recupera a instancia configurada para o Tenant (a mais recente) ou cria uma inicial."""
        instance = db.query(WhatsAppInstance).filter(
            WhatsAppInstance.tenant_id == tenant_id
        ).order_by(WhatsAppInstance.id.desc()).first()

        if not instance:
            import uuid
            session_key = f"tenant_{tenant_id}_{uuid.uuid4().hex[:8]}"
            instance = WhatsAppInstance(
                tenant_id=tenant_id,
                session_name=session_key,
                status=WhatsAppStatus.DISCONNECTED,
                is_active=True
            )
            db.add(instance)
            db.commit()
            db.refresh(instance)
            logger.info(f"🆕 Instância WhatsApp criada para o Tenant {tenant_id}: {session_key}")

        return instance

    @staticmethod
    async def initialize_bot(db: Session, tenant_id: str) -> bool:
        """
        Inicializa um novo bot para o Tenant.
        
        FIX LOOP INFINITO:
        Antes de criar uma nova instância, marca todas as anteriores como
        is_active=False. Sem isso, o health_check_all encontra todas as
        instâncias antigas (DISCONNECTED + is_active=True) e dispara um
        auto-reconnect para cada uma, criando workers órfãos no Bridge.
        """
        import uuid

        # 1. Desativa TODAS as instâncias anteriores do tenant
        old_instances = db.query(WhatsAppInstance).filter(
            WhatsAppInstance.tenant_id == tenant_id,
            WhatsAppInstance.is_active == True
        ).execution_options(ignore_tenant=True).all()

        for old in old_instances:
            old.is_active = False
            old.status = WhatsAppStatus.DISCONNECTED
            logger.info(f"[InitBot] Desativando instância antiga: '{old.session_name}'")

        if old_instances:
            db.commit()

        # 2. Cria nova instância
        session_key = f"tenant_{tenant_id}_{uuid.uuid4().hex[:8]}"
        instance = WhatsAppInstance(
            tenant_id=tenant_id,
            session_name=session_key,
            status=WhatsAppStatus.CONNECTING,
            is_active=True
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)

        # 3. Aciona o Bridge
        success = await whatsapp_bridge.create_session(instance.session_name)

        if success:
            logger.info(f"[InitBot] Bridge aceitou nova sessão: '{instance.session_name}'")
            return True
        else:
            # Rollback: se o Bridge recusou, desfaz a criação
            db.delete(instance)
            db.commit()
            logger.error(f"[InitBot] Bridge rejeitou sessão '{instance.session_name}'.")
            return False

    @staticmethod
    async def stop_bot(db: Session, tenant_id: str) -> bool:
        """Para o bot no Bridge."""
        instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
        success = await whatsapp_bridge.stop_instance(instance.session_name)
        if success:
            instance.status = WhatsAppStatus.DISCONNECTED
            db.commit()
        return success

    @staticmethod
    async def restart_bot(db: Session, tenant_id: str) -> bool:
        """Reinicia o bot no Bridge."""
        instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
        success = await whatsapp_bridge.restart_instance(instance.session_name)
        if success:
            instance.status = WhatsAppStatus.CONNECTING
            db.commit()
        return success

    @staticmethod
    async def sync_instance_status(db: Session, inst: WhatsAppInstance) -> WhatsAppInstance:
        """
        Sincroniza o estado de uma instancia especifica com o Bridge.

        CORRECAO BUG GRAVE #8:
        - Removidos os imports locais duplicados de ws_manager (agora e importado no topo do modulo).
        - 'last_health_check' agora e atualizado em TODA sincronizacao, nao apenas em mudancas.
          Antes, o campo ficava antigo se o status nao mudasse, tornando o health check inutil
          como sinal de "o worker esta vivo".
        - O evento 'bot_status_update' agora usa .value para serializar o Enum corretamente,
          e o campo 'type' no nivel raiz do payload e lido pelo bridge.py para construir
          o envelope {type, conversation_id, data} que o frontend espera.
        - O evento 'bot_qrcode_update' incluiu o campo 'status' como string para completude.
        """
        new_status = await whatsapp_bridge.fetch_status(inst.session_name)

        # Atualiza o timestamp de health check em TODA sincronizacao (independente de mudanca)
        inst.last_health_check = datetime.utcnow()

        # Notifica UI apenas quando houve mudanca efetiva de status
        if inst.status != new_status:
            logger.info(
                f"🔄 Status alterado | session='{inst.session_name}' "
                f"| {inst.status.value if hasattr(inst.status, 'value') else inst.status} "
                f"→ {new_status.value if hasattr(new_status, 'value') else new_status}"
            )
            inst.status = new_status

            # Notificacao de mudanca de status via WebSocket (envelope montado pelo bridge.py)
            await ws_manager.publish_event(inst.tenant_id, {
                "type":    "bot_status_update",
                "status":  new_status.value if hasattr(new_status, "value") else str(new_status),
                "session": inst.session_name
            })

        # Se for QRCODE, busca e entrega o novo QR (somente quando muda)
        if new_status == WhatsAppStatus.QRCODE:
            qr = await whatsapp_bridge.get_qrcode(inst.session_name)
            if qr and qr != inst.qrcode_base64:
                inst.qrcode_base64 = qr
                await ws_manager.publish_event(inst.tenant_id, {
                    "type":    "bot_qrcode_update",
                    "qrcode":  qr,
                    "session": inst.session_name,
                    "status":  new_status.value if hasattr(new_status, "value") else str(new_status)
                })

        db.commit()
        return inst

    @staticmethod
    async def health_check_all(db: Session):
        """
        Tarefa periódica que sincroniza o estado global das instâncias.

        FIX LOOP INFINITO:
        O auto-reconnect agora opera apenas sobre a instância MAIS RECENTE
        de cada tenant. As antigas (is_active=False) são ignoradas.
        O auto-reconnect também só é acionado se a instância já estava
        previamente CONNECTED (teve tokens salvos) — evita ficar tentando
        reconectar sessões que nunca chegaram a parear.
        """
        instances = db.query(WhatsAppInstance).filter(
            WhatsAppInstance.is_active == True
        ).all()

        logger.debug(f"[HealthCheck] Sincronizando {len(instances)} instância(s) ativa(s)...")

        for inst in instances:
            try:
                was_status = inst.status
                await WhatsAppManagerService.sync_instance_status(db, inst)

                current_status = inst.status.value if hasattr(inst.status, "value") else str(inst.status)

                # Auto-reconnect APENAS se: estava CONNECTED antes (tem tokens salvos no disco)
                # e agora aparece DISCONNECTED. Nunca reconecta sessões que ainda não parearam.
                was_connected = (
                    was_status == WhatsAppStatus.CONNECTED
                    or (inst.phone_number is not None)  # Teve número confirmado → já pareou
                )
                if current_status == WhatsAppStatus.DISCONNECTED.value and was_connected:
                    logger.info(
                        f"🔁 [AutoReconnect] '{inst.session_name}' DISCONNECTED após conexão ativa — "
                        f"tentando reconectar via Bridge..."
                    )
                    reconnected = await whatsapp_bridge.create_session(inst.session_name)
                    if reconnected:
                        inst.status = WhatsAppStatus.CONNECTING
                        db.commit()
                        logger.info(f"✅ [AutoReconnect] '{inst.session_name}' reconectando.")
                    else:
                        logger.warning(f"⚠️ [AutoReconnect] Falha ao reconectar '{inst.session_name}'.")
                elif current_status == WhatsAppStatus.DISCONNECTED.value and not was_connected:
                    logger.debug(
                        f"[HealthCheck] '{inst.session_name}' DISCONNECTED sem histórico de conexão "
                        "(nunca pareou) — auto-reconnect suprimido para não criar loop."
                    )

            except Exception as e:
                logger.error(f"❌ [HealthCheck] Erro ao sincronizar '{inst.session_name}': {e}")
