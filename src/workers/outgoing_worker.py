from src.core.bus import rabbitmq_bus
from src.core.database import SessionLocal
from src.core.tenancy import set_current_tenant_id
from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
from src.services.whatsapp_bridge_service import whatsapp_bridge
from src.core.ws import ws_manager
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
            # 🔧 FIX CRÍTICO #2: Busca a instância MAIS RECENTE e ATIVA para o tenant.
            # Se houver múltiplas (ex: re-linkagem), pegamos a última.
            instance = db.query(WhatsAppInstance).filter(
                WhatsAppInstance.tenant_id == tenant_id,
                WhatsAppInstance.is_active == True
            ).order_by(WhatsAppInstance.id.desc()).execution_options(ignore_tenant=True).first()
            
            if not instance:
                logger.error(f"❌ Sem instância ativa para tenant '{tenant_id}'. Mensagem para '{to}' descartada.")
                return

            status_str = instance.status.value if hasattr(instance.status, "value") else str(instance.status)

            # 🔧 FIX CRÍTICO #3: Status Leniente.
            # Se o status no DB é 'disconnected', evitamos o bridge.
            # Se for qualquer outro (qr, connecting, connected), TENTAMOS o envio.
            # Isso resolve o problema de o health_check (30s) estar desatualizado.
            if status_str == WhatsAppStatus.DISCONNECTED.value:
                logger.warning(f"⚠️ Instância '{instance.session_name}' desconectada. Mensagem para '{to}' abortada.")
                return
                
            # 🚀 Lógica de Envio Real com RETRY (Exponential Backoff)
            # Fator crítico para multi-tendência: se o bridge estiver processando 
            # histórico (bloqueio de event loop), o retry garante a entrega.
            max_retries = 3
            retry_delay = 1.0
            response_bridge = {"success": False, "error": "Timeout or No Response"}

            for attempt in range(max_retries):
                try:
                    logger.info(f"📤 Tentativa {attempt+1}/{max_retries} | Sessão: '{instance.session_name}'")
                    if msg_type == "text":
                        response_bridge = await whatsapp_bridge.send_message(
                            session_key=instance.session_name,
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
                # Notifica o frontend via WebSocket RPC — método padronizado
                # publish_event roteia diretamente para broadcast_to_tenant(tenant_id)
                # garantindo que APENAS os agentes deste tenant recebam o status.
                await ws_manager.publish_event(tenant_id, {
                    "method": "message_status_update",
                    "params": {
                        "status":      "sent",
                        "to":          to,
                        "message_id":  response_bridge.get("message_id"),
                        "external_id": response_bridge.get("message_id"),
                        "tenant_id":   tenant_id,
                    },
                })
                logger.info(
                    f"✅ Mensagem enviada ao Bridge | tenant='{tenant_id}' | "
                    f"para='{to}' | msg_id='{response_bridge.get('message_id')}'"
                )
            else:
                logger.error(
                    f"❌ FALHA TOTAL após {max_retries} tentativas | "
                    f"tenant='{tenant_id}' | sessão='{instance.session_name}' | "
                    f"erro='{response_bridge.get('error')}'"
                )

outgoing_worker = OutgoingMessageWorker()

