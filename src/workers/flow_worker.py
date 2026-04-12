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
import uuid
from contextvars import copy_context

class FlowWorker:
    """
    Worker que escuta mensagens do RabbitMQ e processa através da FlowEngine.
    Replicando o Serviço 'SaaS.OmniChannelPlatform.Services.FlowEngine' do .NET.
    """
    async def start(self):
        logger.info("🤖 Iniciando Flow Engine Worker em Segundo Plano...")
        
        # 🔒 FIX MULTI-TENANCY #1: Fila exclusiva por instância de worker.
        # Usando UUID único, cada processo da API cria a sua própria fila.
        # Isso elimina o Round-Robin do RabbitMQ que redirecionava mensagens
        # de Tenant B para o worker do Tenant A (causa raiz do bug).
        worker_queue_name = f"flow_engine_queue_{uuid.uuid4().hex[:8]}"
        
        await rabbitmq_bus.subscribe(
            queue_name=worker_queue_name,
            routing_key="message.incoming",
            exchange_name="messages_exchange",
            callback=self.handle_incoming_message,
            auto_delete=True,
            exclusive=True
        )
        logger.info(f"🤖 FlowWorker inscrito na fila exclusiva: '{worker_queue_name}'")

    async def handle_incoming_message(self, payload: dict):
        """
        Ponto de entrada para processamento de cada mensagem.
        Cada mensagem é processada num contexto de variáveis ISOLADO
        para evitar vazamento de tenant_id entre coroutines concorrentes.
        """
        tenant_id = payload.get("tenant_id")
        data = payload.get("data")
        
        if not tenant_id or not data:
            return

        # 🔒 FIX MULTI-TENANCY #2: Contexto isolado por mensagem.
        # copy_context() cria uma cópia independente do ContextVar atual.
        # Sem isso, set_current_tenant_id() numa coroutine pode contaminar
        # outras coroutines concorrentes que já iniciaram no mesmo event loop.
        ctx = copy_context()
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: ctx.run(set_current_tenant_id, tenant_id)
        )
        
        # Processa a mensagem em bloco isolado (sem afetar outros handlers)
        await self._process_message(tenant_id, data)

    async def _process_message(self, tenant_id: str, data: dict):
        """Lógica interna de processamento, com contexto de tenant já configurado."""
        try:
            set_current_tenant_id(tenant_id)
            
            contact_phone = data.get("from_id")
            user_input = data.get("content", "")
            external_id = data.get("message_id")
            is_from_me = data.get("from_me", False)
            
            # 🟢 Normalização Imediata: Remove sufixos JID (ex: @s.whatsapp.net)
            # Garante que o telefone no Banco de Dados baterá perfeitamente com 
            # as requisições de Histórico do Frontend e o roteamento de Tenancy via WebSocket.
            if contact_phone and "@" in contact_phone:
                contact_phone = contact_phone.split("@")[0]
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

            # 🟢 Notificação Real-time DIRETA via WebSocket (sem intermediário)
            # CRÍTICO: NÃO usar publish_event() — ele publicaria no RabbitMQ
            # numa fila sem consumers, causando o "flip-flop" onde apenas
            # a 1ª mensagem chegava ao frontend e as demais eram engolidas.
            await ws_manager.send_to_conversation(
                tenant_id,
                str(conversation_numeric_id),
                {
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
                }
            )

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
