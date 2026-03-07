from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin
from datetime import datetime

class Plan(Base):
    """
    Tabela global de planos disponíveis (SaaS).
    Replaces the 'PricingPlan' entity from .NET.
    """
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    price = Column(Float, default=0.0)
    currency = Column(String(10), default="BRL")
    
    # Limites e Recursos (Sprint 31)
    max_bots = Column(Integer, default=1)
    max_agents = Column(Integer, default=2)
    max_messages_month = Column(Integer, default=1000)
    is_campaign_enabled = Column(Boolean, default=False)
    is_api_access_enabled = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Subscription(Base):
    """
    Atribuição de um plano a um Tenant.
    Diferente de outros modelos, este não usa MultiTenantMixin para filtragem global
    pois ele é a PRÓPRIA definição do acesso do Tenant.
    """
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(50), unique=True, index=True, nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    
    status = Column(String(50), default="active") # active, trialing, past_due, canceled, suspended
    
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True) # None = vitalício ou renovação auto
    
    last_billing_date = Column(DateTime, default=datetime.utcnow)
    next_billing_date = Column(DateTime, nullable=True)

    # Relacionamentos
    plan = relationship("Plan")
