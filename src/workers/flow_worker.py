from src.core.bus import rabbitmq_bus
from src.core.tenancy import set_current_tenant_id
from src.services.flow_executor import FlowExecutor
from src.models.mongo.flow import FlowDocument
from src.services.session_service import SessionService
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageSide
from src.core.database import SessionLocal
from src.core.ws import ws_manager
from loguru import logger
import json
import asyncio

class FlowWorker:
    """
    Worker que escuta mensagens do RabbitMQ e processa através da FlowEngine.
    Replicando o Serviço 'SaaS.OmniChannelPlatform.Services.FlowEngine' do .NET.
    """
    async def start(self):
        logger.info("🤖 Iniciando Flow Engine Worker em Segundo Plano...")
        
        # Subscreve na fila de mensagens de entrada do Gateway
        await rabbitmq_bus.subscribe(
            queue_name="flow_engine_queue",
            routing_key="message.incoming",
            exchange_name="messages_exchange",
            callback=self.handle_incoming_message
        )

    async def handle_incoming_message(self, payload: dict):
        """
        Ponto de entrada para processamento de cada mensagem.
        """
        try:
            # 1. Recupera Payload Normalizado (UnifiedMessage)
            tenant_id = payload.get("tenant_id")
            data = payload.get("data")
            
            if not tenant_id or not data:
                return

            # Configura Contexto de Tenancy (Sprint 03)
            set_current_tenant_id(tenant_id)
            
            contact_phone = data.get("from_id")
            user_input = data.get("content", "")
            external_id = data.get("message_id")
            is_from_me = data.get("from_me", False)
            computed_side = MessageSide.AGENT if is_from_me else MessageSide.CLIENT

            # Resolve o ID relacional da Conversa para o Frontend ancorar a UI
            with SessionLocal() as db:
                from src.models.whatsapp import WhatsAppInstance
                from src.services.contact_service import ContactService
                
                # Resolve o nome da sessão real (pode ter UUID) para o MongoDB
                instance = db.query(WhatsAppInstance).filter(
                    WhatsAppInstance.tenant_id == tenant_id,
                    WhatsAppInstance.is_active == True
                ).order_by(WhatsAppInstance.id.desc()).execution_options(ignore_tenant=True).first()
                
                actual_session = instance.session_name if instance else f"tenant_{tenant_id}"

                # 👤 Resolve e Enriquece dados do contato (CRM/Sprint 43)
                notify_name = data.get("metadata", {}).get("notifyName") or "Contato S/ Nome"
                contact = ContactService.get_or_create_contact(db, tenant_id, contact_phone, name=notify_name)

                await MessageHistoryService.record_message(
                    db=db,
                    contact_phone=contact_phone,
                    content=user_input,
                    side=computed_side,
                    external_id=external_id,
                    session_name=actual_session
                )
                
                postgre_conv = MessageHistoryService.get_or_create_conversation(db, contact_phone)
                conversation_numeric_id = postgre_conv.id if postgre_conv else contact_phone

            # 🟢 Notificação Real-time via Socket RPC (Sprint 21 + RPC)
            await ws_manager.send_to_conversation(tenant_id, str(conversation_numeric_id), {
                "method": "receive_message",
                "params": {
                    "message_id": external_id,
                    "conversation_id": str(conversation_numeric_id),
                    "contact_phone": contact_phone,
                    "contact": {
                        "id": contact.id,
                        "full_name": contact.full_name,
                        "phone_number": contact.phone_number
                    },
                    "content": user_input,
                    "from_me": is_from_me,
                    "side": "bot" if is_from_me else "client",
                    "type": data.get("type", "text"),
                    "caption": data.get("caption"),
                    "timestamp": data.get("timestamp"),
                    "metadata": data.get("metadata", {})
                }
            })

            # 2. Busca Fluxo Ativo para o Tenant (Regras de Prioridade .NET)
            flow = await FlowDocument.find_one(
                FlowDocument.tenant_id == tenant_id,
                FlowDocument.is_active == True
            )
            
            if not flow:
                logger.warning(f"⚠️ Nenhum fluxo ativo encontrado para o Tenant {tenant_id}")
                return

            # 3. Busca ou Cria Sessão de Chat
            session = await SessionService.get_or_create_session(
                tenant_id=tenant_id,
                contact_phone=contact_phone,
                flow_id=str(flow.id)
            )

            # --- 🟢 Lógica de Handover (Sprint 21) ---
            if session.is_human_support:
                logger.debug(f"👥 Handover ativo para {contact_phone}. O Agente Humano assumiu o chat.")
                await SessionService.update_session(session)
                return

            # 4. Executa o FlowExecutor para o Passo Atual
            executor = FlowExecutor(flow)
            await executor.run_step(session, user_input=user_input)
            
        except Exception as e:
            logger.error(f"❌ Erro fatal no processamento do FlowWorker: {e}")

flow_worker = FlowWorker()
