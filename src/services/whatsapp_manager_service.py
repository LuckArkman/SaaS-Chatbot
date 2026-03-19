from sqlalchemy.orm import Session
from datetime import datetime
from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
from src.services.whatsapp_bridge_service import whatsapp_bridge
from src.core.tenancy import get_current_tenant_id
from loguru import logger
from typing import List, Optional

class WhatsAppManagerService:
    """
    Controlador de Negócio para instâncias de WhatsApp no Tenant.
    Substitui o 'BotOrchestrator' do .NET.
    """
    @staticmethod
    def get_or_create_instance(db: Session, tenant_id: str) -> WhatsAppInstance:
        """Recupera a instância configurada para o Tenant ou cria uma inicial."""
        instance = db.query(WhatsAppInstance).filter(
            WhatsAppInstance.tenant_id == tenant_id
        ).first()
        
        if not instance:
            session_key = f"tenant_{tenant_id}"
            instance = WhatsAppInstance(
                tenant_id=tenant_id,
                session_name=session_key,
                status=WhatsAppStatus.DISCONNECTED,
                is_active=True
            )
            db.add(instance)
            db.commit()
            db.refresh(instance)
            logger.info(f"🆕 Instância WhatsApp criada para o Tenant {tenant_id}")
            
        return instance

    @staticmethod
    async def initialize_bot(db: Session, tenant_id: str) -> bool:
        """Aciona o Bridge para iniciar/reconectar bot."""
        instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
        
        # 🟢 Solicita criação no Node.js Bridge
        result = await whatsapp_bridge.create_session(instance.session_name)
        
        if result.get("success") or "instance" in result or result.get("message") == "Initializing":
            instance.status = WhatsAppStatus.CONNECTING
            db.commit()
            return True
            
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
    async def health_check_all(db: Session):
        """
        Tarefa periódica que sincroniza o estado global das instâncias.
        Detecta sessões desconectadas e atualiza status para UI.
        """
        instances = db.query(WhatsAppInstance).filter(
            WhatsAppInstance.is_active == True
        ).all()
        
        for inst in instances:
            new_status = await whatsapp_bridge.fetch_status(inst.session_name)
            
            # Mudança de Status -> Notifica UI via WebSocket (Sprint 27)
            if inst.status != new_status:
                logger.debug(f"🔄 Instância {inst.session_name} alterada para {new_status}")
                inst.status = new_status
                inst.last_health_check = datetime.utcnow()
                
                from src.core.ws import ws_manager
                await ws_manager.broadcast_to_tenant(inst.tenant_id, {
                    "type": "bot_status_update",
                    "status": new_status,
                    "session": inst.session_name
                })

            # --- 🟢 Lógica de Resiliência (Sprint 29) ---
            # Se a instância deveria estar ativa mas está desconectada, tenta reiniciar
            if new_status == WhatsAppStatus.DISCONNECTED and inst.is_active:
                logger.warning(f"🧟 Instância {inst.session_name} caiu. Tentando reanimação automática...")
                await whatsapp_bridge.create_session(inst.session_name)
                
            # Se for QRCODE, busca o novo e envia (Streaming de QR Code)
            if new_status == WhatsAppStatus.QRCODE:
                qr = await whatsapp_bridge.get_qrcode(inst.session_name)
                if qr and qr != inst.qrcode_base64:
                    inst.qrcode_base64 = qr
                    from src.core.ws import ws_manager
                    await ws_manager.broadcast_to_tenant(inst.tenant_id, {
                        "type": "bot_qrcode_update",
                        "qrcode": qr
                    })
                    
        db.commit()
