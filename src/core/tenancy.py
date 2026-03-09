from contextvars import ContextVar
from typing import Optional

# ContextVar para armazenar o ID do Tenant atual durante a requisição (Thread-safe/Async-safe)
_tenant_context: ContextVar[Optional[str]] = ContextVar("tenant_context", default=None)

def get_current_tenant_id() -> Optional[str]:
    """Retorna o Tenant ID do contexto atual."""
    return _tenant_context.get()

def set_current_tenant_id(tenant_id: str) -> None:
    """Define o Tenant ID no contexto da requisição atual."""
    _tenant_context.set(tenant_id)

class TenantContextError(Exception):
    """Erro lançado quando o Tenant ID não é encontrado no contexto quando obrigatório."""
    pass
