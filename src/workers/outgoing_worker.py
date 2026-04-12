from src.core.bus import rabbitmq_bus
from src.core.database import SessionLocal
from src.core.tenancy import set_current_tenant_id
from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
from src.services.whatsapp_bridge_service import whatsapp_bridge
from src.core.ws import ws_manager
from loguru import logger
import asyncio
import uuid

class OutgoingMessageWorker:
    """
    Worker que consome a fila de mensagens de saída e efetiva o envio
    via WhatsApp Bridge (Baileys).
    """
    async def start(self):
        logger.info("📤 Iniciando Outgoing Message Worker no RabbitMQ...")
        
        # 🔒 FIX MULTI-TENANCY: Fila exclusiva por instância.
        # Garante que todos os workers recebam cada evento de envio (sem Round-Robin).
        worker_queue_name = f"outgoing_whatsapp_queue_{uuid.uuid4().hex[:8]}"
        
        await rabbitmq_bus.subscribe(
            queue_name=worker_queue_name,
            routing_key="message.outgoing",
            exchange_name="messages_exchange",
            callback=self.process_outgoing,
            auto_delete=True,
            exclusive=True
        )
        logger.info(f"📤 OutgoingWorker inscrito na fila exclusiva: '{worker_queue_name}'")

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
        set_current_tenant_id(tenant_id)
        
        # Transação Curta Inicial: Busca a sessão ativa e o status atual
        with SessionLocal() as db:
            # 🔧 FIX CRÍTICO #2: Busca a instância MAIS RECENTE e ATIVA para o tenant.
            instance = db.query(WhatsAppInstance).filter(
                WhatsAppInstance.tenant_id == tenant_id,
                WhatsAppInstance.is_active == True
            ).order_by(WhatsAppInstance.id.desc()).execution_options(ignore_tenant=True).first()
            
            if not instance:
                logger.error(f"❌ Sem instância ativa para tenant '{tenant_id}'. Mensagem para '{to}' descartada.")
                return

            status_str = instance.status.value if hasattr(instance.status, "value") else str(instance.status)
            session_name = instance.session_name

        # 🔧 FIX CRÍTICO #3: Status Leniente executado fora da SessionLocal.
        if status_str == WhatsAppStatus.DISCONNECTED.value:
            logger.warning(f"⚠️ Instância '{session_name}' desconectada. Mensagem para '{to}' abortada.")
            return
                
        # 🚀 Lógica de Envio Real com RETRY (Exponential Backoff) executada FORA do Postgres
        max_retries = 3
        retry_delay = 1.0
        response_bridge = {"success": False, "error": "Timeout or No Response"}

        for attempt in range(max_retries):
            try:
                logger.info(f"📤 Tentativa {attempt+1}/{max_retries} | Sessão: '{session_name}'")
                if msg_type == "text":
                    # Chamada assíncrona executada FORA da transação do Postgres
                    # (Correção: Problema Arquitetural #14)
                    response_bridge = await whatsapp_bridge.send_message(
                        session_key=session_name,
                        to=to,
                        content=content
                    )
                    if response_bridge.get("success"):
                        break # Sucesso!
                else:
                    logger.warning(f"⚠️ Tipo '{msg_type}' não suportado.")
                    return

            except Exception as e:
                logger.warning(f"⚠️ Falha na tentativa {attempt+1}: {e}")
            
            # Falhou ou Bridge lento? Espera e dobra o tempo (backoff)
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                retry_delay *= 2

        # 🎯 Pós-processamento do resultado do Bridge
        if response_bridge.get("success"):
            # Callback de sucesso via Barramento Distribuído (RPC Pattern)
            # 🔒 FIX BUG #3: Substituindo send_to_conversation (local) por publish_event (distribuído)
            await ws_manager.publish_event(tenant_id, {
                "method": "update_message_status",
                "params": {
                    "status": "sent",
                    "message_id": response_bridge.get("message_id"),
                    "external_id": response_bridge.get("message_id"),
                    "to": to
                }
            })
            logger.info(f"✅ Mensagem entregue ao Bridge para '{to}' (ID: {response_bridge.get('message_id')})")
        else:
            logger.error(
                f"❌ FALHA TOTAL após {max_retries} tentativas para '{session_name}'. "
                f"Erro: {response_bridge.get('error')}"
            )

outgoing_worker = OutgoingMessageWorker()
