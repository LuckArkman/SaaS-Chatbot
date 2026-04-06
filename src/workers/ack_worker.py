from src.core.bus import rabbitmq_bus
from src.core.tenancy import set_current_tenant_id
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageStatus
from src.core.database import SessionLocal
from src.core.ws import ws_manager
from src.schemas.whatsapp import WhatsAppAckStatus
from loguru import logger
import asyncio

class AckWorker:
    """
    Worker que processa confirmações de recebimento (ACKs) de mensagens do provider.
    Replicando o Serviço 'SaaS.Omnichannel.Services.AckTracker' do .NET.
    """
    async def start(self):
        logger.info("✔️ Iniciando Ack Tracking Worker em Segundo Plano...")
        
        # Subscreve na fila de ACKs do Gateway
        await rabbitmq_bus.subscribe(
            queue_name="message_ack_queue",
            routing_key="message.ack",
            exchange_name="messages_exchange",
            callback=self.handle_message_ack
        )

    async def handle_message_ack(self, payload: dict):
        """
        Ponto de entrada para cada confirmação (READ, DELIVERED, etc).
        """
        tenant_id = payload.get("tenant_id")
        ack_data = payload.get("ack") # Pydantic WhatsAppAck
        
        if not tenant_id or not ack_data:
            return

        set_current_tenant_id(tenant_id)
        
        external_id = ack_data.get("id")
        ws_status = ack_data.get("status") # Ex: 3 = Delivered, 4 = Read
        
        # 1. Converte Status do WhatsApp para o Modelo Interno
        new_status = MessageStatus.SENT
        if ws_status == WhatsAppAckStatus.DELIVERED:
            new_status = MessageStatus.DELIVERED
        elif ws_status == WhatsAppAckStatus.READ:
            new_status = MessageStatus.READ
        elif ws_status == WhatsAppAckStatus.ERROR:
            new_status = MessageStatus.ERROR
            
        # 2. Persistência Postgres
        with SessionLocal() as db:
            from src.models.chat import Message, Conversation
            
            # Resolve o contato/conversa desta mensagem para notificar o frontend
            msg_obj = db.query(Message).filter(Message.external_id == external_id).first()
            contact_phone = "unknown"
            if msg_obj and msg_obj.conversation:
                contact_phone = msg_obj.conversation.contact_phone

            updated = MessageHistoryService.update_message_status(db, external_id, new_status)
            
            if updated:
                # 3. Notificação WebSocket para o Agente (Real-time UI Update via RPC)
                await ws_manager.send_to_conversation(tenant_id, contact_phone, {
                    "method": "update_message_status",
                    "params": {
                        "external_id": external_id,
                        "conversation_id": contact_phone,
                        "status": new_status,
                        "timestamp": ack_data.get("t")
                    }
                })
                logger.debug(f"🔔 WebSocket Notificado (RPC): Msg {external_id} Status {new_status}")

ack_worker = AckWorker()
