from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from src.models.chat import MessageSide

class MessageBase(BaseModel):
    content: str
    side: MessageSide
    type: str = "text"
    external_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(MessageBase):
    pass

class MessageOut(MessageBase):
    id: int
    conversation_id: int
    is_read: bool
    agent_id: Optional[int] = None

    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    contact_phone: str
    last_message_content: Optional[str]
    last_interaction: datetime
    is_active: bool

    class Config:
        from_attributes = True

class ConversationWithMessages(ConversationOut):
    messages: List[MessageOut]
