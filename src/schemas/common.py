import re
from typing import Annotated
from pydantic import AfterValidator

# Regex para validar números de WhatsApp no padrão internacional (E.164)
# Ex: +5511999999999
WHATSAPP_PHONE_REGEX = r"^\+[1-9]\d{1,14}$"

def validate_whatsapp_phone(v: str) -> str:
    """Validador customizado para garantir formato internacional de telefone."""
    if not re.match(WHATSAPP_PHONE_REGEX, v):
        raise ValueError("Formato de telefone inválido. Use o padrão internacional +55...")
    return v

# Tipo Pydantic customizado e reutilizável
WhatsAppPhone = Annotated[str, AfterValidator(validate_whatsapp_phone)]
