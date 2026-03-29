from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
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


# --- Schemas para rotas de contatos via WhatsApp Bridge ---

class WhatsAppContactAdd(BaseModel):
    """Payload para adicionar/verificar um contato no WhatsApp do agente."""
    phone: str
    name: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def phone_must_have_digits(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 8:
            raise ValueError("O campo 'phone' deve conter ao menos 8 dígitos.")
        return v


class WhatsAppContactVerified(BaseModel):
    """Contato verificado/retornado pelo Bridge."""
    jid: str
    phone: str
    name: Optional[str] = None
    short_name: Optional[str] = None
    verified: Optional[bool] = None


class WhatsAppContactAddOut(BaseModel):
    """Resposta da rota POST /contacts/whatsapp."""
    success: bool
    contact: Optional[WhatsAppContactVerified] = None
    persisted: Optional[ContactOut] = None
    error: Optional[str] = None


class WhatsAppContactListOut(BaseModel):
    """Resposta da rota GET /contacts/whatsapp."""
    success: bool
    total: int = 0
    contacts: List[WhatsAppContactVerified] = []
    error: Optional[str] = None
