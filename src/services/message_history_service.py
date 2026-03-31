from sqlalchemy.orm import Session
from datetime import datetime
from src.models.chat import Conversation, Message, MessageSide, MessageStatus
from src.core.tenancy import get_current_tenant_id
from loguru import logger
from typing import List, Optional

class MessageHistoryService:
    """
    Serviço central de persistência de histórico de chat (Postgres).
    Replica a lógica da camada de dados do ChatApp original.
    """
    @staticmethod
    def get_or_create_conversation(db: Session, contact_phone: str) -> Conversation:
        tenant_id = get_current_tenant_id()
        
        conversation = db.query(Conversation).filter(
            Conversation.contact_phone == contact_phone,
            Conversation.tenant_id == tenant_id
        ).first()

        if not conversation:
            conversation = Conversation(
                contact_phone=contact_phone,
                last_interaction=datetime.utcnow(),
                is_active=True
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            logger.info(f"📁 Nova conversa persistida no Postgres para {contact_phone} (Tenant: {tenant_id})")
            
        return conversation

    @staticmethod
    async def record_message(
        db: Session, 
        contact_phone: str, 
        content: str, 
        side: MessageSide,
        agent_id: Optional[int] = None,
        msg_type: str = "text",
        external_id: Optional[str] = None,
        status: MessageStatus = MessageStatus.SENT,
        session_name: Optional[str] = None
    ) -> Message:
        """Salva uma mensagem no histórico (Postgres + MongoDB) e atualiza a última interação."""
        conversation = MessageHistoryService.get_or_create_conversation(db, contact_phone)
        tenant_id = get_current_tenant_id()
        
        # 🟢 1. Persistência Postgres
        message = Message(
            conversation_id=conversation.id,
            side=side,
            content=content,
            type=msg_type,
            agent_id=agent_id,
            external_id=external_id,
            status=status
        )
        
        conversation.last_message_content = content[:50] + ("..." if len(content) > 50 else "")
        conversation.last_interaction = datetime.utcnow()
        
        db.add(message)
        db.commit()
        db.refresh(message)

        # 🟢 2. Persistência MongoDB (Sprint 40 - Requisito de Restauração)
        from src.services.chat_service import chat_service
        from src.models.mongo.chat import MessageSource
        
        source_map = {
            MessageSide.CLIENT: MessageSource.USER,
            MessageSide.BOT: MessageSource.AGENT,
            MessageSide.AGENT: MessageSource.HUMAN,
            MessageSide.SYSTEM: MessageSource.SYSTEM
        }
        
        try:
            await chat_service.save_message(
                tenant_id=tenant_id,
                session_name=session_name or f"tenant_{tenant_id}",
                contact_phone=contact_phone,
                content=content,
                source=source_map.get(side, MessageSource.SYSTEM),
                message_type=msg_type,
                external_id=external_id
            )
        except Exception as e:
            logger.error(f"⚠️ Falha ao espelhar mensagem no MongoDB: {e}")
        
        logger.debug(f"💾 Mensagem salva (ID Postgres: {message.id}) para {contact_phone}")
        return message

    @staticmethod
    def update_message_status(db: Session, external_id: str, new_status: MessageStatus) -> bool:
        """Atualiza o status de uma mensagem via ID externo (Provider)."""
        message = db.query(Message).filter(Message.external_id == external_id).first()
        if not message:
            return False
            
        # Não permite 'downgrade' de status (ex: voltar de READ para DELIVERED)
        status_order = {
            MessageStatus.PENDING: 0,
            MessageStatus.SENT: 1,
            MessageStatus.DELIVERED: 2,
            MessageStatus.READ: 3,
            MessageStatus.ERROR: 4
        }
        
        if status_order.get(new_status, -1) > status_order.get(message.status, -1):
            message.status = new_status
            db.commit()
            logger.debug(f"✔️ Status da Mensagem {external_id} atualizado para {new_status}")
            return True
            
        return False

    @staticmethod
    def list_history(
        db: Session, 
        contact_phone: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> List[Message]:
        tenant_id = get_current_tenant_id()
        conversation = db.query(Conversation).filter(
            Conversation.contact_phone == contact_phone,
            Conversation.tenant_id == tenant_id
        ).first()
        
        if not conversation:
            return []
            
        return db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def list_conversations(
        db: Session,
        tenant_id: str,
        only_active: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[int, List]:
        """
        Retorna a lista paginada de todas as conversas do Tenant,
        com contagens de mensagens não lidas e totais calculadas.
        """
        from sqlalchemy import func
        from src.models.chat import MessageStatus
        
        query = db.query(Conversation).filter(
            Conversation.tenant_id == tenant_id
        )
        
        if only_active:
            query = query.filter(Conversation.is_active == True)
        
        query = query.order_by(Conversation.last_interaction.desc())
        
        total = query.count()
        conversations = query.offset(offset).limit(limit).all()
        
        # Enriquecer cada conversa com contagens calculadas
        result = []
        for conv in conversations:
            total_msgs = db.query(func.count(Message.id)).filter(
                Message.conversation_id == conv.id
            ).scalar() or 0
            
            unread_count = db.query(func.count(Message.id)).filter(
                Message.conversation_id == conv.id,
                Message.is_read == False,
                Message.side == 'client'
            ).scalar() or 0
            
            conv_dict = {
                "id": conv.id,
                "contact_phone": conv.contact_phone,
                "last_message_content": conv.last_message_content,
                "last_interaction": conv.last_interaction,
                "is_active": conv.is_active,
                "agent_id": conv.agent_id,
                "agent": conv.agent,
                "unread_count": unread_count,
                "total_messages": total_msgs,
            }
            result.append(conv_dict)
        
        logger.debug(f"📋 Listando {len(result)} conversas para Tenant {tenant_id} (total={total})")
        return total, result

    @staticmethod
    def get_conversation_detail(
        db: Session,
        tenant_id: str,
        conversation_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> Optional[dict]:
        """
        Retorna a conversa com um contato específico, incluindo o histórico
        de mensagens paginado e metadados da conversa.
        """
        from sqlalchemy import func
        
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id
        ).first()
        
        if not conversation:
            return None
        
        total_msgs = db.query(func.count(Message.id)).filter(
            Message.conversation_id == conversation.id
        ).scalar() or 0
        
        unread_count = db.query(func.count(Message.id)).filter(
            Message.conversation_id == conversation.id,
            Message.is_read == False,
            Message.side == 'client'
        ).scalar() or 0
        
        messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.asc()).offset(offset).limit(limit).all()
        
        # Marca mensagens do cliente como lidas
        db.query(Message).filter(
            Message.conversation_id == conversation.id,
            Message.is_read == False,
            Message.side == 'client'
        ).update({Message.is_read: True})
        db.commit()
        
        logger.info(f"📖 Histórico carregado: Conversa #{conversation_id} ({len(messages)} msgs) para Tenant {tenant_id}")
        
        return {
            "conversation": {
                "id": conversation.id,
                "contact_phone": conversation.contact_phone,
                "last_message_content": conversation.last_message_content,
                "last_interaction": conversation.last_interaction,
                "is_active": conversation.is_active,
                "agent_id": conversation.agent_id,
                "agent": conversation.agent,
                "unread_count": unread_count,
                "total_messages": total_msgs,
            },
            "messages": messages,
            "total_messages": total_msgs,
            "has_more": (offset + limit) < total_msgs
        }
