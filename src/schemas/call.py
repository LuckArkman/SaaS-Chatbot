from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class CallCreate(BaseModel):
    """Payload para iniciar uma chamada de voz via WhatsApp."""
    phone_number: str


class CallReject(BaseModel):
    """Payload para rejeitar uma chamada recebida."""
    call_id: str
    caller_jid: str


class CallOut(BaseModel):
    """Resposta de uma chamada iniciada/rejeitada."""
    success: bool
    status: Optional[str] = None
    call_id: Optional[str] = None
    to: Optional[str] = None
    phone: Optional[str] = None
    error: Optional[str] = None


class IncomingCallNotification(BaseModel):
    """Payload do evento de chamada recebida (WebSocket → Frontend)."""
    call_id: str
    caller_jid: str
    caller_phone: str
    caller_name: str
    is_video: bool = False
    timestamp: Optional[int] = None
