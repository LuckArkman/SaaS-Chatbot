from typing import List, Optional, Any, Dict
from datetime import datetime
from src.models.mongo.chat import MessageDocument, MessageSource
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageSide
from src.core.bus import rabbitmq_bus
from src.core.redis import redis_client
from src.core.ws import ws_manager
from sqlalchemy.orm import Session
from loguru import logger

class ChatService:
    """
    Serviço Unificado de Chat (Postgres + MongoDB).
    Controla interações em tempo real (Sprint 21) e Persistência de Histórico (Sprint 40).
    """
    
    # --- 🟢 Lógica Original de Agente Humano (.NET Migration) ---
    
    @staticmethod
    async def send_agent_message(db: Session, tenant_id: str, agent_id: str, payload: Dict[str, Any]):
        """
        Envia uma mensagem do agente para o cliente final e persiste no histórico (Dual Write).
        """
        raw_conversation_id = str(payload.get("conversation_id"))
        content = payload.get("content")
        
        if not raw_conversation_id or not content:
            return

        # Trata cenário em que o front-end envia o ID da tabela Postgres em vez do telefone:
        contact_phone = raw_conversation_id
        if raw_conversation_id.isdigit() and len(raw_conversation_id) < 10:
            from src.models.chat import Conversation
            conv = db.query(Conversation).filter(
                Conversation.id == int(raw_conversation_id),
                Conversation.tenant_id == tenant_id
            ).first()
            if conv:
                contact_phone = conv.contact_phone

        # 1. Persistência Dual (Postgres + MongoDB via MessageHistoryService)
        # ✅ Note: Agora record_message é assíncrono
        await MessageHistoryService.record_message(
            db=db,
            contact_phone=contact_phone,
            content=content,
            side=MessageSide.AGENT,
            agent_id=int(agent_id),
            session_name=f"tenant_{tenant_id}"
        )
        
        # 🟢 Atualiza SLA de Primeira Resposta (Sprint 25)
        conversation = MessageHistoryService.get_or_create_conversation(db, contact_phone)
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
                "to": contact_phone,
                "content": content,
                "type": "text"
            }
        )
        
        # 3. Sync com as outras telas do mesmo Tenant (Broadcast WebSocket)
        await ws_manager.send_to_conversation(tenant_id, raw_conversation_id, {
            "agent_id": agent_id,
            "content": content,
            "side": "agent",
            "timestamp": str(datetime.utcnow())
        })
        
        logger.info(f"👨‍💻 Agente {agent_id} enviou msg para {contact_phone}")

    @staticmethod
    async def set_typing_status(tenant_id: str, conversation_id: str, is_typing: bool):
        """Define o status de 'digitando' no Redis e notifica outros agentes."""
        key = f"typing:{tenant_id}:{conversation_id}"
        if is_typing:
            # TTL de 5s para não prender o status se travar
            await redis_client.set(key, "typing", expire=5)
        else:
            await redis_client.delete(key)

        await ws_manager.send_to_conversation(tenant_id, conversation_id, {
            "type": "typing_update",
            "is_typing": is_typing,
            "conversation_id": conversation_id
        })

    # --- 🔵 Lógica Nova de Histórico (MongoDB) ---

    @staticmethod
    async def save_message(
        tenant_id: str,
        session_name: str,
        contact_phone: str,
        content: str,
        source: MessageSource,
        contact_name: Optional[str] = None,
        message_type: str = "text",
        external_id: Optional[str] = None,
        flow_id: Optional[str] = None
    ) -> MessageDocument:
        """Salva uma mensagem diretamente no MongoDB (Beanie)."""
        try:
            message = MessageDocument(
                tenant_id=tenant_id,
                session_name=session_name,
                contact_phone=contact_phone,
                contact_name=contact_name,
                content=content,
                source=source,
                message_type=message_type,
                external_id=external_id,
                flow_id=flow_id,
                timestamp=datetime.utcnow()
            )
            await message.insert()
            return message
        except Exception as e:
            logger.error(f"❌ Erro ao salvar mensagem no MongoDB: {e}")
            raise

    @staticmethod
    async def get_history(
        tenant_id: str,
        contact_phone: str,
        limit: int = 50
    ) -> List[MessageDocument]:
        """Recupera o histórico de conversas de um contato."""
        try:
            return await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == contact_phone
            ).sort("-timestamp").limit(limit).to_list()
        except Exception as e:
            logger.error(f"❌ Erro ao buscar histórico no MongoDB: {e}")
            return []

    @staticmethod
    async def get_session_history(
        tenant_id: str,
        session_name: str,
        limit: int = 100
    ) -> List[MessageDocument]:
        """Recupera o histórico de uma sessão inteira (vários contatos)."""
        try:
            # Retorna em ordem cronológica (sort timestamp ascendente para o Front)
            docs = await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.session_name == session_name
            ).sort("+timestamp").limit(limit).to_list()
            return docs
        except Exception as e:
            logger.error(f"❌ Erro ao buscar histórico da sessão: {e}")
            return []

chat_service = ChatService()
