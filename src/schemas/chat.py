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
    status: Optional[str] = None

    class Config:
        from_attributes = True


class AgentSummary(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    contact_phone: str
    last_message_content: Optional[str] = None
    last_interaction: datetime
    is_active: bool
    agent_id: Optional[int] = None
    agent: Optional[AgentSummary] = None
    unread_count: int = 0
    total_messages: int = 0

    class Config:
        from_attributes = True


class ConversationWithMessages(ConversationOut):
    messages: List[MessageOut] = []


class ConversationListResponse(BaseModel):
    total: int
    conversations: List[ConversationOut]


class ConversationDetailResponse(BaseModel):
    conversation: ConversationOut
    messages: List[MessageOut]
    total_messages: int
    has_more: bool
