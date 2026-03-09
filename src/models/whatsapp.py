from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum as SQLEnum, event
from datetime import datetime
import enum
from src.core.database import Base
from src.core.multi_tenancy import MultiTenantMixin, tenant_persistence_hook

class WhatsAppStatus(str, enum.Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    QRCODE = "qrcode"
    CONNECTED = "connected"
    ERR_SESSION = "error_session"

class WhatsAppInstance(Base, MultiTenantMixin):
    """
    Representação persistente de uma instância do WhatsApp (Venom Session).
    Replaces the 'BotInstance' C# entity from .NET.
    """
    __tablename__ = "whatsapp_instances"

    id = Column(Integer, primary_key=True, index=True)
    session_name = Column(String(100), unique=True, index=True) # Geralmente 'tenant_123'
    
    status = Column(SQLEnum(WhatsAppStatus), default=WhatsAppStatus.DISCONNECTED)
    webhook_url = Column(String(255), nullable=True)
    
    # Credenciais e Metadados (Sprint 26)
    external_id = Column(String(100), nullable=True) # ID na Evolution/Venom API
    qrcode_base64 = Column(Text, nullable=True) # Último QR Code gerado
    
    battery_level = Column(Integer, default=0)
    phone_number = Column(String(20), nullable=True)
    
    is_active = Column(Boolean, default=True)
    last_health_check = Column(DateTime, default=datetime.utcnow)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Registrar hook de persistência automática de tenant_id
event.listen(WhatsAppInstance, 'before_insert', tenant_persistence_hook)
