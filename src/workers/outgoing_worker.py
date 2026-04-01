from src.core.bus import rabbitmq_bus
from src.core.database import SessionLocal
from src.core.tenancy import set_current_tenant_id
from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
from src.services.whatsapp_bridge_service import whatsapp_bridge
from loguru import logger
import asyncio

class OutgoingMessageWorker:
    """
    Worker que consome a fila de mensagens de saída e efetiva o envio
    via WhatsApp Bridge (Baileys).
    """
    async def start(self):
        logger.info("📤 Iniciando Outgoing Message Worker no RabbitMQ...")
        
        await rabbitmq_bus.subscribe(
            queue_name="outgoing_whatsapp_queue",
            routing_key="message.outgoing",
            exchange_name="messages_exchange",
            callback=self.process_outgoing
        )

    async def process_outgoing(self, payload: dict):
        """
        Processa o envio de uma mensagem para o WhatsApp.
        Ex: {"tenant_id": "...", "to": "...", "content": "...", "type": "text"}
        """
        tenant_id = payload.get("tenant_id")
        to = payload.get("to")
        content = payload.get("content")
        msg_type = payload.get("type", "text")
        
        if not tenant_id or not to or not content:
            logger.error(f"❌ Payload inválido descartado: {payload}")
            return

        # 🔧 FIX CRÍTICO #1: Define o contexto de tenant ANTES de qualquer query.
        # Sem isso, o filtro global de MultiTenantMixin pode herdar o tenant_id
        # de uma task asyncio anterior, consultando o banco do tenant errado.
        set_current_tenant_id(tenant_id)
            
        with SessionLocal() as db:
            # 🔧 FIX CRÍTICO #2: ignore_tenant=True para garantir que a busca
            # pela instância não seja bloqueada pelo filtro global de multi-tenancy
            # em caso de race condition de contexto.
            instance = db.query(WhatsAppInstance).filter(
                WhatsAppInstance.tenant_id == tenant_id
            ).execution_options(ignore_tenant=True).first()
            
            if not instance:
                logger.error(f"❌ Nenhuma instância configurada para o tenant '{tenant_id}'. Mensagem para '{to}' descartada.")
                return

            # 🔧 FIX CRÍTICO #3: Usa comparação por string (.value) — consistente
            # com o restante do codebase (bot.py, gateway.py) para evitar falha
            # silenciosa causada por mismatch de tipo Enum vs String do SQLAlchemy.
            status_str = instance.status.value if hasattr(instance.status, "value") else str(instance.status)

            if status_str != WhatsAppStatus.CONNECTED.value:
                logger.warning(
                    f"⚠️ Instância '{instance.session_name}' não está conectada "
                    f"(Status: '{status_str}'). Mensagem para '{to}' descartada. "
                    f"Inicie e conecte o bot antes de enviar mensagens."
                )
                return
                
            # Envio Real via Bridge
            if msg_type == "text":
                success = await whatsapp_bridge.send_message(
                    session_key=instance.session_name,
                    to=to,
                    content=content
                )
                if not success:
                    logger.error(
                        f"❌ Falha ao enviar mensagem para '{to}' via Bridge "
                        f"(Sessão: '{instance.session_name}'). "
                        f"Verifique os logs do Node.js Bridge na porta 4000."
                    )
            else:
                logger.warning(f"⚠️ Envio de mídias (tipo '{msg_type}') ainda não suportado no worker de envio.")

outgoing_worker = OutgoingMessageWorker()

