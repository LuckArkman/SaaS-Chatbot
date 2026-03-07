from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from src.schemas.common import WhatsAppPhone

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FILE = "file"
    LOCATION = "location"
    CONTACT = "contact"

class IncomingMessage(BaseModel):
    """
    Schema para mensagens recebidas dos canais (WhatsApp/Bot).
    """
    provider_message_id: str = Field(..., description="ID original da mensagem no provider")
    from_phone: WhatsAppPhone = Field(..., description="Telefone do remetente")
    to_phone: WhatsAppPhone = Field(..., description="Telefone do destinatário (Canal)")
    type: MessageType = Field(default=MessageType.TEXT)
    content: str = Field(..., description="Conteúdo textual ou URL da mídia")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Dados extras do provider")
    timestamp: int = Field(..., description="Timestamp da mensagem no provider")
