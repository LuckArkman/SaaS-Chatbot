from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from src.schemas.gateway import MessageType

class WhatsAppMessageEvent(str, Enum):
    ON_MESSAGE = "on_message"
    ON_ACK = "on_ack"
    ON_STATE_CHANGE = "on_state_change"
    ON_INCOMING_CALL = "on_incoming_call"

class WhatsAppAckStatus(int, Enum):
    ERROR = 0
    PENDING = 1
    SERVER = 2
    DELIVERED = 3
    READ = 4

class WhatsAppPayload(BaseModel):
    """
    Payload bruto recebido do Venom-bot/Evolution API.
    """
    event: WhatsAppMessageEvent
    session: str
    payload: Dict[str, Any]

class WhatsAppMessage(BaseModel):
    """
    Estrutura de uma mensagem dentro do payload do WhatsApp.
    """
    id: str
    body: str
    type: MessageType
    t: int # timestamp
    notifyName: Optional[str] = None
    from_phone: str = Field(..., alias="from")
    to_phone: str = Field(..., alias="to")
    isGroupMsg: bool = False
    isMedia: bool = False
    caption: Optional[str] = None
    mimetype: Optional[str] = None

    class Config:
        populate_by_name = True

class WhatsAppAck(BaseModel):
    """
    Estrutura de confirmação de leitura/entrega.
    """
    id: str
    to: str
    status: WhatsAppAckStatus
    ack: int
