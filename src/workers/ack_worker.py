from src.core.bus import rabbitmq_bus
from src.core.tenancy import set_current_tenant_id
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageStatus
from src.core.database import SessionLocal
from src.core.ws import ws_manager
from src.schemas.whatsapp import WhatsAppAckStatus
from loguru import logger
import asyncio
import uuid
from contextvars import copy_context

class AckWorker:
    """
    Worker que processa confirmações de recebimento (ACKs) de mensagens do provider.
    Replicando o Serviço 'SaaS.Omnichannel.Services.AckTracker' do .NET.
    """
    async def start(self):
        logger.info("✔️ Iniciando Ack Tracking Worker em Segundo Plano...")
        
        # 🔒 FIX MULTI-TENANCY: Fila exclusiva por instância.
        # Evita Round-Robin que entregaria ACKs do Tenant B ao worker do Tenant A.
        worker_queue_name = f"message_ack_queue_{uuid.uuid4().hex[:8]}"
        
        await rabbitmq_bus.subscribe(
            queue_name=worker_queue_name,
            routing_key="message.ack",
            exchange_name="messages_exchange",
            callback=self.handle_message_ack,
            auto_delete=True,
            exclusive=True
        )
        logger.info(f"✔️ AckWorker inscrito na fila exclusiva: '{worker_queue_name}'")

    async def handle_message_ack(self, payload: dict):
        """
        Ponto de entrada para cada confirmação (READ, DELIVERED, etc).
        Processado num contexto de variáveis ISOLADO para evitar
        vazamento de tenant_id entre coroutines concorrentes.
        """
        tenant_id = payload.get("tenant_id")
        ack_data = payload.get("ack")
        
        if not tenant_id or not ack_data:
            return

        # Isola o contexto desta mensagem para evitar contaminação de outros handlers
        ctx = copy_context()
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: ctx.run(set_current_tenant_id, tenant_id)
        )
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
            
        # 2. Persistência de status exclusivamente no MongoDB
        from src.models.mongo.chat import MessageDocument
        from src.models.chat import Conversation
        
        mongo_msg = await MessageDocument.find_one(MessageDocument.external_id == external_id)
        numeric_id = "unknown"
        
        if mongo_msg:
            # Resolve o ID numérico da conversa via Postgres (usando contact_phone do Mongo)
            with SessionLocal() as db:
                conv = db.query(Conversation).filter(
                    Conversation.contact_phone == mongo_msg.contact_phone,
                    Conversation.tenant_id == tenant_id
                ).first()
                if conv:
                    numeric_id = str(conv.id)

        updated = await MessageHistoryService.update_message_status(None, external_id, new_status)
        
        if updated:
            # 3. Notificação RPC via Bus (Garante entrega em cenários distribuídos)
            await ws_manager.publish_event(tenant_id, {
                "method": "update_message_status",
                "params": {
                    "external_id": external_id,
                    "conversation_id": numeric_id,
                    "status": new_status,
                    "timestamp": ack_data.get("t")
                }
            })
            logger.debug(f"🔔 Evento de Status publicado no Bus: Msg {external_id} Status {new_status}")

ack_worker = AckWorker()
