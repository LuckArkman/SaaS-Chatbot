from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ChannelType(str, Enum):
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    INSTAGRAM = "instagram"
    WEBCHAT = "webchat"

class UnifiedMessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FILE = "file"
    LOCATION = "location"

class UnifiedMessage(BaseModel):
    """
    O formato canônico de mensagem para todo o ecossistema SaaS Chatbot.
    Dessa forma, o FlowEngine e o ChatService não precisam saber de qual canal a mensagem veio.
    Repreplacing the 'MessageDTO' from the original .NET project.
    """
    # Identificação
    message_id: str = Field(..., description="ID único gerado pelo sistema ou provider")
    tenant_id: str = Field(..., description="ID do Tenant proprietário")
    
    # Roteamento
    channel: ChannelType
    from_id: str = Field(..., description="Identificador do remetente (ex: Telefone)")
    to_id: str = Field(..., description="Identificador do destinatário (ex: Canal ID)")
    
    # Conteúdo
    type: UnifiedMessageType = Field(default=UnifiedMessageType.TEXT)
    content: str = Field(..., description="Conteúdo textual ou Link para mídia")
    caption: Optional[str] = None
    
    # Metadados e Estado
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Flags de Processamento
    is_bot_message: bool = False
    from_me: bool = False
    
    def sanitize_content(self):
        """Limpeza básica do conteúdo textual."""
        if self.type == UnifiedMessageType.TEXT:
            self.content = self.content.strip().replace("\r\n", "\n")
