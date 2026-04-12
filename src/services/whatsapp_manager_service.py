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
        """Aciona o Bridge para iniciar bot. Sempre cria uma nova instancia isolada garantindo re-auth limpo."""
        import uuid

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

        success = await whatsapp_bridge.create_session(instance.session_name)

        if success:
            instance.status = WhatsAppStatus.CONNECTING
            db.commit()
            return True
        else:
            db.delete(instance)
            db.commit()
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
        Tarefa periodica que sincroniza o estado global das instancias.
        Detecta sessoes desconectadas e atualiza status para UI.

        Se a instancia estiver DISCONNECTED apos a sincronizacao, tenta reconectar
        automaticamente via Bridge — o Baileys reutiliza os tokens salvos em disco.

        CORRECAO BUG GRAVE #8:
        - Commit do auto_reconnect removido do loop: sync_instance_status ja comita.
          O commit duplo gerava undo logs desnecessarios e locks de curta duracao.
        - Log de health_check agora inclui contagem de instancias processadas.
        """
        instances = db.query(WhatsAppInstance).filter(
            WhatsAppInstance.is_active == True
        ).all()

        logger.debug(f"[HealthCheck] Sincronizando {len(instances)} instancia(s) ativa(s)...")

        for inst in instances:
            try:
                await WhatsAppManagerService.sync_instance_status(db, inst)

                # Auto-reconnect: se ainda DISCONNECTED apos sync, tenta recriar no Bridge
                # O Baileys reutiliza os tokens persistidos em /tokens/<session_name>/
                current_status = inst.status.value if hasattr(inst.status, "value") else str(inst.status)
                if current_status == WhatsAppStatus.DISCONNECTED.value:
                    logger.info(
                        f"🔁 [AutoReconnect] '{inst.session_name}' DISCONNECTED — "
                        f"tentando reconectar via Bridge..."
                    )
                    reconnected = await whatsapp_bridge.create_session(inst.session_name)
                    if reconnected:
                        inst.status = WhatsAppStatus.CONNECTING
                        db.commit()  # commit somente apos auto_reconnect (sync ja comitou antes)
                        logger.info(f"✅ [AutoReconnect] '{inst.session_name}' reconectando.")
                    else:
                        logger.warning(f"⚠️ [AutoReconnect] Falha ao reconectar '{inst.session_name}'.")

            except Exception as e:
                # Um erro em uma instancia nao deve parar o health check das demais
                logger.error(f"❌ [HealthCheck] Erro ao sincronizar '{inst.session_name}': {e}")
