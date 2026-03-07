from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.services.campaign_service import CampaignService
from src.schemas.campaign import CampaignCreate, CampaignOut
from src.api import deps
from src.core.database import get_db
from src.core.tenancy import get_current_tenant_id
from src.models.campaign import Campaign, CampaignStatus
from loguru import logger

router = APIRouter()

@router.get("/", response_model=List[CampaignOut])
def list_campaigns(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Busca as campanhas ativas do Tenant."""
    return db.query(Campaign).filter(Campaign.tenant_id == tenant_id).all()

@router.post("/", response_model=CampaignOut)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Cria um rascunho de campanha."""
    return CampaignService.create_campaign(db, tenant_id, campaign_in.name, campaign_in.message_template)

@router.post("/{campaign_id}/schedule")
async def schedule_campaign_endpoint(
    campaign_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Agenda e inicia o disparo da campanha."""
    success = await CampaignService.schedule_campaign(db, campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    return {"status": "scheduled", "success": True}

@router.post("/{campaign_id}/pause")
async def pause_campaign_endpoint(
    campaign_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Pausa o disparo de uma campanha em andamento."""
    campaign = db.query(Campaign).get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    campaign.status = CampaignStatus.PAUSED
    db.commit()
    logger.info(f"⏸️ Campanha {campaign_id} pausada pelo usuário.")
    return {"status": "paused", "success": True}
