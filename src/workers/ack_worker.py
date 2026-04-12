from src.core.bus import rabbitmq_bus
from src.core.tenancy import set_current_tenant_id
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageStatus
from src.core.database import SessionLocal
from src.core.ws import ws_manager
from src.schemas.whatsapp import WhatsAppAckStatus
from loguru import logger
import uuid

class AckWorker:
    """
    Worker que processa confirmacoes de recebimento (ACKs) de mensagens do provider.
    Replicando o Servico 'SaaS.Omnichannel.Services.AckTracker' do .NET.
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
        Ponto de entrada para cada confirmacao (READ, DELIVERED, etc).

        CORRECAO BUG #2: Removido o bloco run_in_executor/copy_context que era dead code.
        O run_in_executor definia o ContextVar numa thread do pool — valor completamente
        invisivel para esta coroutine no event loop. O set_current_tenant_id() deve ser
        chamado DIRETAMENTE na coroutine atual para que o filtro MultiTenantMixin
        funcione corretamente nas queries SQLAlchemy subsequentes.
        """
        tenant_id = payload.get("tenant_id")
        ack_data  = payload.get("ack")

        if not tenant_id or not ack_data:
            logger.warning(f"⚠️ AckWorker: payload inválido (tenant={tenant_id})")
            return

        # ✅ Define o contexto de tenant DIRETAMENTE na coroutine atual.
        set_current_tenant_id(tenant_id)

        external_id = ack_data.get("id")
        ws_status   = ack_data.get("status")  # Ex: 1=Server, 2=Received, 3=Delivered, 4=Read

        # 1. Converte Status do WhatsApp para o Modelo Interno
        new_status = MessageStatus.SENT
        if ws_status == WhatsAppAckStatus.DELIVERED:
            new_status = MessageStatus.DELIVERED
        elif ws_status == WhatsAppAckStatus.READ:
            new_status = MessageStatus.READ
        elif ws_status == WhatsAppAckStatus.ERROR:
            new_status = MessageStatus.ERROR

        logger.debug(f"[AckWorker] ACK recebido | msg='{external_id}' | ws_status={ws_status} → {new_status.value}")

        # 2. Resolve o ID numérico da conversa via MongoDB → Postgres
        from src.models.mongo.chat import MessageDocument
        from src.models.chat import Conversation

        mongo_msg  = await MessageDocument.find_one(MessageDocument.external_id == external_id)
        numeric_id = "unknown"

        if mongo_msg:
            with SessionLocal() as db:
                # Busca a conversa usando o contact_phone registrado no MongoDB
                conv = db.query(Conversation).filter(
                    Conversation.contact_phone == mongo_msg.contact_phone,
                    Conversation.tenant_id == tenant_id
                ).execution_options(ignore_tenant=True).first()
                if conv:
                    numeric_id = str(conv.id)

        # 3. Atualiza status no MongoDB (sem db — metodo e MongoDB-only)
        updated = await MessageHistoryService.update_message_status(external_id, new_status)

        if updated:
            # 4. Notificação RPC via Bus → Bridge → Frontend
            # CORRECAO: new_status.value (str) em vez de new_status (Enum) para serializacao JSON segura.
            await ws_manager.publish_event(tenant_id, {
                "method": "update_message_status",
                "params": {
                    "external_id":     external_id,
                    "conversation_id": numeric_id,
                    "status":          new_status.value,  # ← Enum → str para JSON
                    "timestamp":       ack_data.get("t")
                }
            })
            logger.debug(
                f"🔔 ACK notificado via Bus | msg='{external_id}' "
                f"| conv='{numeric_id}' | status='{new_status.value}'"
            )

ack_worker = AckWorker()
