import httpx
from typing import Any, Dict, List, Optional
from src.schemas.flow import FlowNode, NodeType
from src.common.schemas import UnifiedMessage, UnifiedMessageType
from src.core.bus import rabbitmq_bus
from src.services.condition_evaluator import ConditionEvaluator
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageSide
from src.core.database import SessionLocal
from loguru import logger
from datetime import datetime

class NodeActions:
    """
    Biblioteca de funções executoras para cada tipo de nó.
    Replicando o comportamento de 'NodeHandlers' do .NET.
    """
    @staticmethod
    async def execute_message_node(node: FlowNode, tenant_id: str, contact_phone: str, variables: Dict[str, Any]):
        """Executa um nó de envio de mensagem e persiste no histórico."""
        raw_text = node.data.get("text", "")
        # Injeção de variáveis (Sprint 18)
        processed_text = ConditionEvaluator.inject_variables(raw_text, variables)
        
        # 🟢 Persistência Postgres + MongoDB (Histórico do Bot)
        with SessionLocal() as db:
            from src.models.whatsapp import WhatsAppInstance
            # Resolve o nome da sessão real (pode ter UUID) para o MongoDB
            instance = db.query(WhatsAppInstance).filter(
                WhatsAppInstance.tenant_id == tenant_id,
                WhatsAppInstance.is_active == True
            ).order_by(WhatsAppInstance.id.desc()).execution_options(ignore_tenant=True).first()
            
            actual_session = instance.session_name if instance else f"tenant_{tenant_id}"

        # 🟢 Persistência Postgres + MongoDB (Histórico do Bot)
        # Executada FORA da trasaçao SQLAlchemy local (Problema Arquitetural #13)
        await MessageHistoryService.record_message(
            contact_phone=contact_phone,
            content=processed_text,
            side=MessageSide.BOT,
            session_name=actual_session
        )

        # Envia para a fila de saída para que o bot entregue
        await rabbitmq_bus.publish(
            exchange_name="messages_exchange",
            routing_key="message.outgoing",
            message={
                "tenant_id": tenant_id,
                "to": contact_phone,
                "type": "text",
                "content": processed_text
            }
        )

    @staticmethod
    async def execute_api_call_node(node: FlowNode, variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executa uma chamada HTTP para API externa (Sprint 19).
        Similar ao IHttpClientFactory + Polly no .NET.
        """
        url = node.data.get("url")
        method = node.data.get("method", "GET")
        headers = node.data.get("headers", {})
        body = node.data.get("body", {})
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    json=body if method != "GET" else None,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"❌ Falha na API Call do Nó {node.id}: {e}")
                return {"error": str(e)}

    @staticmethod
    async def execute_handover_node(tenant_id: str, contact_phone: str):
        """Transfere o atendimento para um humano (ChatService)."""
        from src.services.agent_assignment_service import AgentAssignmentService
        from src.services.message_history_service import MessageHistoryService
        
        # 1. Garante que a Conversa existe
        with SessionLocal() as db:
            conversation = MessageHistoryService.get_or_create_conversation(db, contact_phone)
            
            # 2. Atribui Agente Automático (Sprint 24)
            agent = await AgentAssignmentService.assign_agent(db, conversation)
            
            # 3. Notifica via RabbitMQ para o Gateway saber (Handover Realizado)
            await rabbitmq_bus.publish(
                exchange_name="messages_exchange",
                routing_key="chat.handover",
                message={
                    "tenant_id": tenant_id,
                    "contact_phone": contact_phone,
                    "assigned_agent_id": agent.id if agent else None,
                    "timestamp": str(datetime.utcnow())
                }
            )

        # 🟢 Notifica Front-end via WebSocket que um chat entrou na fila/atribuído
        from src.core.ws import ws_manager
        await ws_manager.broadcast_to_tenant(tenant_id, {
            "type": "chat_assigned",
            "contact_phone": contact_phone,
            "agent_id": agent.id if agent else None
        })

    @staticmethod
    async def execute_ai_node(
        node: FlowNode,
        tenant_id: str,
        contact_phone: str,
        variables: Dict[str, Any],
        user_input: str
    ):
        """
        Executa um nó de IA usando o Google Gemini.
        O system_prompt pode ser configurado no campo 'data' do nó no FlowBuilder.
        """
        from src.services.gemini_service import GeminiService

        system_prompt = node.data.get("system_prompt", "Você é um assistente virtual prestativo e simpático.")
        
        # Busca histórico recente para contexto multi-turn (últimas 10 trocas)
        with SessionLocal() as db:
            recent_messages = await MessageHistoryService.get_recent_messages(
                db, contact_phone=contact_phone, limit=10
            )
        
        # get_recent_messages retorna List[dict] com chaves "side" (MessageSide Enum) e "content" (str).
        # CORRECAO BUG #5a: m.side / m.content causavam AttributeError — dicts nao tem atributos.
        # CORRECAO BUG #5b: converte o Enum MessageSide para string antes de passar ao GeminiService,
        # pois build_history_from_messages compara side == "client" / "bot" (strings).
        conversation_history = GeminiService.build_history_from_messages(
            [
                {
                    "side":    m["side"].value if hasattr(m["side"], "value") else str(m["side"]),
                    "content": m["content"]
                }
                for m in recent_messages
            ]
        )

        # Injeta variáveis da sessão no prompt do usuário se aplicável
        processed_input = ConditionEvaluator.inject_variables(user_input, variables)

        logger.info(f"🧠 Gemini: processando input de {contact_phone} (histórico: {len(conversation_history)} turns)")
        
        ai_reply = await GeminiService.generate_response(
            user_message=processed_input,
            system_prompt=system_prompt,
            conversation_history=conversation_history
        )

        # Persiste a resposta do bot no histórico (transação interna ao metodo)
        await MessageHistoryService.record_message(
            contact_phone=contact_phone,
            content=ai_reply,
            side=MessageSide.BOT,
            session_name=f"tenant_{tenant_id}"
        )

        # Publica na fila de saída para o Bridge entregar via WhatsApp
        await rabbitmq_bus.publish(
            exchange_name="messages_exchange",
            routing_key="message.outgoing",
            message={
                "tenant_id": tenant_id,
                "to": contact_phone,
                "type": "text",
                "content": ai_reply
            }
        )
        logger.info(f"✅ Resposta Gemini enviada para {contact_phone}: '{ai_reply[:80]}...' ")

