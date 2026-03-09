from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin

# Tabela associativa Agente <> Departamento (N:N)
agent_department = Table(
    "agent_department",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id"), primary_key=True)
)

class Department(Base, MultiTenantMixin):
    """
    Representação de um Departamento/Setor (Ex: Vendas, Suporte).
    Replaces the 'Department' entity from .NET.
    """
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    
    # Relacionamentos
    agents = relationship("User", secondary=agent_department, back_populates="departments")
