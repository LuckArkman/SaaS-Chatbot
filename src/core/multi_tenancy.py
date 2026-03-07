from sqlalchemy import Column, String, event
from sqlalchemy.orm import Session, with_loader_criteria
from src.core.tenancy import get_current_tenant_id

class MultiTenantMixin:
    """
    Mixin para adicionar isolamento de Tenant às entidades.
    """
    tenant_id = Column(String, index=True, nullable=False)

# --- Filtro Global de Query ---
@event.listens_for(Session, "do_orm_execute")
def _add_tenant_filter(execute_state):
    """
    Injeta automaticamente o filtro 'WHERE tenant_id = ...' em todas as queries
    de modelos que herdam de MultiTenantMixin.
    Equivalente ao Global Query Filter do EF Core.
    """
    tenant_id = get_current_tenant_id()
    
    if (
        execute_state.is_select
        and not execute_state.is_column_load
        and not execute_state.is_relationship_load
        and tenant_id
    ):
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                MultiTenantMixin,
                lambda cls: cls.tenant_id == tenant_id,
                include_aliases=True
            )
        )

# --- Hook de Salvamento Automático ---
def tenant_persistence_hook(mapper, connection, target):
    """
    Garante que o tenant_id seja injetado no objeto antes de ser persistido.
    """
    if hasattr(target, "tenant_id") and not target.tenant_id:
        target.tenant_id = get_current_tenant_id()

# Nota: O registro desse mapper deve ser feito no modelo específico que usa o mixin
