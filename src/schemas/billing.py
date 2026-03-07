from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

# --- Plan Schemas (SaaS) ---
class PlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "BRL"
    max_bots: int
    max_agents: int
    max_messages_month: int
    is_campaign_enabled: bool = False
    is_api_access_enabled: bool = False

class PlanCreate(PlanBase):
    pass

class PlanOut(PlanBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Subscription Schemas ---
class SubscriptionBase(BaseModel):
    plan_id: int
    status: str = "active"

class SubscriptionCreate(SubscriptionBase):
    tenant_id: str

class SubscriptionOut(SubscriptionBase):
    id: int
    tenant_id: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    plan: PlanOut

    class Config:
        from_attributes = True
