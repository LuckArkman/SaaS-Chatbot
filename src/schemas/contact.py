from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TagBase(BaseModel):
    name: str
    color: str = "#007bff"

class TagCreate(TagBase):
    pass

class TagOut(TagBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ContactBase(BaseModel):
    phone_number: str
    full_name: Optional[str] = None
    is_blacklisted: bool = False

class ContactCreate(ContactBase):
    pass

class ContactOut(ContactBase):
    id: int
    tags: List[TagOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
