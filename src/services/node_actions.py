import httpx
from typing import Any, Dict, Optional
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
        
        # 🟢 Persistência Postgres (Histórico do Bot)
        with SessionLocal() as db:
            MessageHistoryService.record_message(
                db=db,
                contact_phone=contact_phone,
                content=processed_text,
                side=MessageSide.BOT
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
