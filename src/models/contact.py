from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Table, ForeignKey, event
from sqlalchemy.orm import relationship
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin, tenant_persistence_hook
from datetime import datetime

# Tabela associativa para Tags (Sprint 37)
contact_tags = Table(
    "contact_tags_assoc",
    Base.metadata,
    Column("contact_id", Integer, ForeignKey("contacts.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True)
)

class Tag(Base, MultiTenantMixin):
    """
    Tags para segmentação de contatos.
    Replaces 'LeadTag' from .NET.
    """
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    color = Column(String(20), default="#007bff")
    
    created_at = Column(DateTime, default=datetime.utcnow)

class Contact(Base, MultiTenantMixin):
    """
    Lead/Contato global do Tenant.
    Utilizado para campanhas e CRM.
    """
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(50), index=True, nullable=False)
    full_name = Column(String(200), nullable=True)
    
    # Status de Retenção
    is_blacklisted = Column(Boolean, default=False) # Opt-out
    last_campaign_id = Column(Integer, nullable=True) # ID da última campanha recebida
    
    tags = relationship("Tag", secondary=contact_tags, backref="contacts")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Registrar hooks
event.listen(Tag, 'before_insert', tenant_persistence_hook)
event.listen(Contact, 'before_insert', tenant_persistence_hook)
