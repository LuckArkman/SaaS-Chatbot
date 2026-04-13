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
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Busca as campanhas ativas do Tenant."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID missing")
    return db.query(Campaign).filter(Campaign.tenant_id == tenant_id).all()

@router.post("/", response_model=CampaignOut)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Cria um rascunho de campanha."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID missing")
    return CampaignService.create_campaign(db, tenant_id, campaign_in.name, campaign_in.message_template)

@router.post("/{campaign_id}/schedule")
async def schedule_campaign_endpoint(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Agenda e inicia o disparo da campanha."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID missing")
    
    # Valida se a campanha pertence ao tenant
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.tenant_id == tenant_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
        
    success = await CampaignService.schedule_campaign(db, campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Falha ao agendar campanha")
    return {"status": "scheduled", "success": True}

@router.post("/{campaign_id}/pause")
async def pause_campaign_endpoint(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Pausa o disparo de uma campanha em andamento."""
    tenant_id = current_user.tenant_id
    
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.tenant_id == tenant_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    campaign.status = CampaignStatus.PAUSED
    db.commit()
    logger.info(f"⏸️ Campanha {campaign_id} pausada pelo usuário.")
    return {"status": "paused", "success": True}
