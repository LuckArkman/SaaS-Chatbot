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
from typing import Dict
from collections import defaultdict

# 🔧 Cache local de Locks em memória para mitigar concorrência.
# Resolve condição de corrida na inserção de MÚLTIPLAS mensagens do mesmo contato simultaneamente (ex: sync de histórico)
# que geravam duplicação no banco de dados e bugs na UI.
_processing_locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

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
            
            # 🟢 Normalização Imediata: Remove sufixos JID (ex: @s.whatsapp.net)
            # Garante que o telefone no Banco de Dados baterá perfeitamente com 
            # as requisições de Histórico do Frontend e o roteamento de Tenancy via WebSocket.
            if contact_phone and "@" in contact_phone:
                contact_phone = contact_phone.split("@")[0]

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
