from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, event
from sqlalchemy.orm import relationship
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin, tenant_persistence_hook
from datetime import datetime

class Invoice(Base, MultiTenantMixin):
    """
    Fatura mensal gerada para o Tenant.
    Replica a entidade 'InvoiceRecord' do .NET.
    """
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True)
    
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="open") # open, paid, overdue, canceled
    
    plan_name = Column(String(100)) # Snapshot do nome do plano na época
    
    # PDF/Document Link (Simulado)
    pdf_url = Column(String(255), nullable=True)
    
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Registrar hook de persistência automática de tenant_id
event.listen(Invoice, 'before_insert', tenant_persistence_hook)
