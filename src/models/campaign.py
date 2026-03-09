from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, JSON, event
from sqlalchemy.orm import relationship
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin, tenant_persistence_hook
from datetime import datetime
from enum import Enum

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELED = "canceled"

class Campaign(Base, MultiTenantMixin):
    """
    Modelo de Campanhas de Disparo Massivo.
    Replaces 'MassCampaign' entity from .NET.
    """
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Conteúdo do Disparo
    message_template = Column(Text, nullable=False)
    media_url = Column(String(255), nullable=True)
    
    # Configuração de Agendamento
    scheduled_at = Column(DateTime, index=True, nullable=True) # Se null, disparo manual/imediato
    status = Column(String(50), default=CampaignStatus.DRAFT)
    
    # Métricas de Conversão (Sprint 39)
    total_contacts = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    read_count = Column(Integer, default=0)
    replied_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    
    # Configurações de Anti-Ban (Sprint 38)
    min_delay = Column(Integer, default=5) # segundos entre mensagens
    max_delay = Column(Integer, default=15)
    
    # Horários de Silêncio (Não disparar nestas horas)
    sleep_start = Column(Integer, default=22) # 22h
    sleep_end = Column(Integer, default=8)   # 08h
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Relacionamento com os contatos da campanha (Sprint 37)
class CampaignContact(Base, MultiTenantMixin):
    """
    Fila de disparos individuais de uma campanha.
    """
    __tablename__ = "campaign_contacts"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True)
    
    phone_number = Column(String(50), nullable=False)
    contact_name = Column(String(200), nullable=True)
    
    status = Column(String(50), default="pending") # pending, sent, error
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

# Registrar hooks de multi-tenancy
event.listen(Campaign, 'before_insert', tenant_persistence_hook)
event.listen(CampaignContact, 'before_insert', tenant_persistence_hook)
