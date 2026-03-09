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
            Conversation.contact_phone == contact_phone
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
    def record_message(
        db: Session, 
        contact_phone: str, 
        content: str, 
        side: MessageSide,
        agent_id: Optional[int] = None,
        msg_type: str = "text",
        external_id: Optional[str] = None,
        status: MessageStatus = MessageStatus.SENT
    ) -> Message:
        """Salva uma mensagem no histórico e atualiza a última interação da conversa."""
        conversation = MessageHistoryService.get_or_create_conversation(db, contact_phone)
        
        # Cria a mensagem
        message = Message(
            conversation_id=conversation.id,
            side=side,
            content=content,
            type=msg_type,
            agent_id=agent_id,
            external_id=external_id,
            status=status
        )
        
        # Atualiza o preview da conversa
        conversation.last_message_content = content[:50] + ("..." if len(content) > 50 else "")
        conversation.last_interaction = datetime.utcnow()
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        logger.debug(f"💾 Mensagem salva (ID: {message.id}) para {contact_phone}")
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
        conversation = db.query(Conversation).filter(
            Conversation.contact_phone == contact_phone
        ).first()
        
        if not conversation:
            return []
            
        return db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
