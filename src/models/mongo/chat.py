from typing import Optional, List
from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
import enum

class MessageSource(str, enum.Enum):
    USER = "user"         # Mensagem vinda do cliente final
    AGENT = "agent"       # Resposta do bot/IA
    SYSTEM = "system"     # Eventos de sistema
    HUMAN = "human"       # Atendimento humano (handover)

class MessageDocument(Document):
    """
    Persistência completa de cada interação no SaaS (Sprint 40).
    Permite restaurar o histórico completo após sincronização do WhatsApp.
    """
    tenant_id: Indexed(str)
    session_name: Indexed(str)
    
    # Identificadores da Conversa
    contact_phone: Indexed(str)
    contact_name: Optional[str] = None
    
    # Detalhes da Mensagem
    content: str
    source: MessageSource = MessageSource.USER
    message_type: str = "text" # text, image, audio, etc.
    
    # Metadados do Canal (WhatsApp ID, etc)
    external_id: Optional[str] = None
    
    # Gestão de Fluxo (opcional para rastreio)
    flow_id: Optional[str] = None
    
    # Auditoria e Exibição
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Status de Entrega (opcional)
    ack: int = 0 # 0=Pending, 1=Sent, 2=Delivered, 3=Read

    class Settings:
        name = "chat_history"
        indexes = [
            [("tenant_id", 1), ("contact_phone", 1), ("timestamp", -1)],
            [("tenant_id", 1), ("session_name", 1)],
            "external_id"
        ]

    model_config = {
        "json_schema_extra": {
            "example": {
                "tenant_id": "tenant_abc",
                "session_name": "tenant_abc",
                "contact_phone": "5511999999999",
                "content": "Olá, gostaria de saber o preço.",
                "source": "user",
                "timestamp": "2026-03-21T18:00:00Z"
            }
        }
    }
