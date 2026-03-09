from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    message_template: str
    media_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignOut(CampaignBase):
    id: int
    status: str
    total_contacts: int
    sent_count: int
    error_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CampaignContactBase(BaseModel):
    phone_number: str
    contact_name: Optional[str] = None

class CampaignContactOut(CampaignContactBase):
    id: int
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
