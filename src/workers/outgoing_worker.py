from src.core.bus import rabbitmq_bus
from src.core.database import SessionLocal
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
            
        with SessionLocal() as db:
            # 1. Busca instância do Bot do Tenant
            instance = db.query(WhatsAppInstance).filter(
                WhatsAppInstance.tenant_id == tenant_id
            ).first()
            
            if not instance:
                logger.error(f"❌ Nenhuma instância configurada para o tenant {tenant_id}.")
                return
                
            if instance.status != WhatsAppStatus.CONNECTED:
                logger.warning(f"⚠️ Instância {instance.session_name} não está conectada (Status: {instance.status}). Mensagem descartada por segurança ou aguardando bot.")
                return
                
            # 2. Chama a Bridge
            if msg_type == "text":
                success = await whatsapp_bridge.send_message(
                    session_key=instance.session_name,
                    to=to,
                    content=content
                )
                if not success:
                    logger.error(f"❌ Falha ao enviar mensagem para {to} via Bridge (Sessão: {instance.session_name})")
            else:
                logger.warning(f"⚠️ Envio de mídias (tipo {msg_type}) ainda não suportado no worker de envio.")

outgoing_worker = OutgoingMessageWorker()
