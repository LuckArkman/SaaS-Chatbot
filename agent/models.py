from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Role(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Message(BaseModel):
    role: Role
    content: str

class AgentConfig(BaseModel):
    provider: str
    model: str
    api_key: str
    temperature: float = 0.7
    max_tokens: int = 1000
    system_prompt: Optional[str] = "You are a helpful AI assistant."
    extra_kwargs: Dict[str, Any] = Field(default_factory=dict)
