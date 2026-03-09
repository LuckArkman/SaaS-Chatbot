from sqlalchemy import Column, Integer, String, Float, DateTime, Text, event
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin, tenant_persistence_hook
from datetime import datetime

class Transaction(Base, MultiTenantMixin):
    """
    Log histórico de pagamentos e transações financeiras (SaaS).
    Substitui a entidade 'PaymentTransaction' do .NET.
    """
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    external_id = Column(String(100), unique=True, index=True) # ID no Gateway (MP/Stripe)
    provider = Column(String(50)) # mercadopago, stripe, asaas
    
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="BRL")
    
    status = Column(String(50)) # approved, pending, rejected, refunded
    payment_method = Column(String(50)) # pix, credit_card, boleto
    
    details = Column(Text, nullable=True) # JSON bruto do callback
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Registrar hook de persistência automática de tenant_id
event.listen(Transaction, 'before_insert', tenant_persistence_hook)
