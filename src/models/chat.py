from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, event, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin, tenant_persistence_hook

class MessageSide(str, enum.Enum):
    CLIENT = "client"
    AGENT = "agent"
    BOT = "bot"
    SYSTEM = "system"

class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    ERROR = "error"

class Conversation(Base, MultiTenantMixin):
    """
    Representação de uma conversa entre um contato e um Tenant.
    Replaces the 'Conversation' entity from .NET.
    """
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    contact_phone = Column(String(20), nullable=False, index=True)

    # Índice Composto para busca rápida por Tenant + Telefone (Sprint 43)
    __table_args__ = (
        Index("ix_tenant_contact", "tenant_id", "contact_phone"),
    )
    last_message_content = Column(Text, nullable=True)
    last_interaction = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)

    # SLA Metrics (Sprint 25)
    first_response_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relacionamentos
    agent = relationship("User")
    department = relationship("Department")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base, MultiTenantMixin):
    """
    Registro histórico de cada interação.
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    
    side = Column(SQLEnum(MessageSide), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(20), default="text") # text, image, file, etc
    
    status = Column(SQLEnum(MessageStatus), default=MessageStatus.SENT, index=True)
    
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Se for agente
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_read = Column(Boolean, default=False)
    external_id = Column(String(255), nullable=True, index=True) # ID do provider (WhatsApp)

    # Relacionamentos
    conversation = relationship("Conversation", back_populates="messages")
    agent = relationship("User")

# Registrar hooks de persistência automática de tenant_id
event.listen(Conversation, 'before_insert', tenant_persistence_hook)
event.listen(Message, 'before_insert', tenant_persistence_hook)
