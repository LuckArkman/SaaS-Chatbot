from src.core.bus import rabbitmq_bus
from src.core.redis import redis_client
from src.core.ws import ws_manager
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageSide
from sqlalchemy.orm import Session
from loguru import logger
from typing import Any, Dict

class ChatService:
    """
    Controlador de interações em tempo real entre Agentes e Clientes.
    Responsável por garantir que a mensagem do atendente chegue ao canal correto.
    Replaces the 'ChatHub' and 'MessageController' logic from .NET.
    """
    @staticmethod
    async def send_agent_message(db: Session, tenant_id: str, agent_id: str, payload: Dict[str, Any]):
        """
        Envia uma mensagem do agente para o cliente final e persiste no histórico.
        """
        conversation_id = payload.get("conversation_id")
        content = payload.get("content")
        
        if not conversation_id or not content:
            return
            
        # 1. Persistência no Postgres (Histórico)
        MessageHistoryService.record_message(
            db=db,
            contact_phone=conversation_id,
            content=content,
            side=MessageSide.AGENT,
            agent_id=int(agent_id)
        )
        
        # 🟢 Atualiza SLA de Primeira Resposta (Sprint 25)
        conversation = MessageHistoryService.get_or_create_conversation(db, conversation_id)
        if not conversation.first_response_at:
            conversation.first_response_at = datetime.utcnow()
            db.commit()

        # 2. Dispatch para o Canal (via RabbitMQ)
        await rabbitmq_bus.publish(
            exchange_name="messages_exchange",
            routing_key="message.outgoing",
            message={
                "tenant_id": tenant_id,
                "agent_id": agent_id,
                "to": conversation_id,
                "content": content,
                "type": "text"
            }
        )
        
        # 3. Sync com as outras telas do mesmo Tenant (Broadcast WebSocket)
        await ws_manager.send_to_conversation(tenant_id, conversation_id, {
            "agent_id": agent_id,
            "content": content,
            "side": "agent"
        })
        
        logger.info(f"👨‍💻 Agente {agent_id} enviou msg para {conversation_id}")

    @staticmethod
    async def set_typing_status(tenant_id: str, conversation_id: str, is_typing: bool):
        """
        Define o status de 'digitando' no Redis e notifica outros agentes.
        Expira em 5 segundos automaticamente se não for renovado.
        """
        key = f"typing:{tenant_id}:{conversation_id}"
        if is_typing:
            await redis_client.set(key, "typing", expire=5)
        else:
            await redis_client.delete(key)
            
        await ws_manager.send_to_conversation(tenant_id, conversation_id, {
            "type": "typing_update",
            "is_typing": is_typing
        })
