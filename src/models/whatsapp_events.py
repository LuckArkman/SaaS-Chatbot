from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, event
from datetime import datetime
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin, tenant_persistence_hook

class WhatsAppSystemEvent(Base, MultiTenantMixin):
    """
    Log de eventos de sistema reportados pelas instâncias do WhatsApp.
    Usado para auditoria de uptime e health metrics.
    Replaces the 'BotEventLog' from .NET.
    """
    __tablename__ = "whatsapp_system_events"

    id = Column(Integer, primary_key=True, index=True)
    session_name = Column(String(100), index=True)
    
    event_type = Column(String(50), index=True) # CONNECTED, DISCONNECTED, BATTERY_LOW, etc
    details = Column(Text, nullable=True) # JSON ou descrição amigável
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Registrar hook de persistência automática de tenant_id
event.listen(WhatsAppSystemEvent, 'before_insert', tenant_persistence_hook)
