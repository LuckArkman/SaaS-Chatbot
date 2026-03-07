from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from src.models.mongo.flow import FlowDocument
from src.schemas.flow import FlowCreate, FlowUpdate
from src.api import deps
from src.core.tenancy import get_current_tenant_id
from loguru import logger

router = APIRouter()

@router.get("/", response_model=List[FlowDocument])
async def list_flows(
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Lista todos os fluxos do Tenant."""
    return await FlowDocument.find(FlowDocument.tenant_id == tenant_id).to_list()

@router.post("/", response_model=FlowDocument)
async def create_flow(
    flow_in: FlowCreate,
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Cria um novo fluxo de automação."""
    # Desativa outros fluxos se este for o principal (simplificado)
    # await FlowDocument.find(FlowDocument.tenant_id == tenant_id).update({"is_active": False})
    
    flow = FlowDocument(
        tenant_id=tenant_id,
        **flow_in.model_dump()
    )
    await flow.insert()
    return flow

@router.get("/{flow_id}", response_model=FlowDocument)
async def get_flow(
    flow_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Busca um fluxo específico por ID."""
    flow = await FlowDocument.get(flow_id)
    if not flow or flow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Flow not found")
    return flow

@router.patch("/{flow_id}", response_model=FlowDocument)
async def update_flow(
    flow_id: str,
    flow_in: FlowUpdate,
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Atualiza um fluxo existente."""
    flow = await FlowDocument.get(flow_id)
    if not flow or flow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    update_data = flow_in.model_dump(exclude_unset=True)
    await flow.update({"$set": update_data})
    
    return flow

@router.delete("/{flow_id}")
async def delete_flow(
    flow_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Remove um fluxo."""
    flow = await FlowDocument.get(flow_id)
    if not flow or flow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Flow not found")
    await flow.delete()
    return {"success": True}
