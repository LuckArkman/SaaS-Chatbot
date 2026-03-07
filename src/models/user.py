from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin

class User(Base, MultiTenantMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    
    # SaaS - Tenancy
    tenant_id = Column(String, index=True, nullable=False)
    
    # Suporte / Agentes (Sprint 24)
    is_agent = Column(Boolean(), default=False)
    max_concurrent_chats = Column(Integer, default=5)
    current_chats_count = Column(Integer, default=0)
    
    # Suporte / Departamentos (Sprint 25)
    from src.models.department import agent_department
    departments = relationship("Department", secondary=agent_department, back_populates="agents")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Aqui você pode adicionar Role e Claims conforme necessário nas próximas sprints
