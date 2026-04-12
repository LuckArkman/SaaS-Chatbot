from sqlalchemy.orm import Session
from src.models.campaign import Campaign, CampaignContact, CampaignStatus
from loguru import logger
from typing import List, Optional
from datetime import datetime

class CampaignService:
    """
    Controlador de campanhas e disparos em massa.
    Replicando 'BroadcastingService' do .NET.
    """
    @staticmethod
    def create_campaign(db: Session, tenant_id: str, name: str, message: str) -> Campaign:
        """Cria um rascunho de campanha."""
        campaign = Campaign(
            tenant_id=tenant_id,
            name=name,
            message_template=message,
            status=CampaignStatus.DRAFT
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        logger.info(f"📁 Campanha '{name}' criada para o Tenant {tenant_id}")
        return campaign

    @staticmethod
    def add_contacts(db: Session, campaign_id: int, contacts: List[str]):
        """Adiciona contatos para o disparo (Sprint 37 irá expandir)."""
        for phone in contacts:
            contact = CampaignContact(
                campaign_id=campaign_id,
                phone_number=phone,
                status="pending"
            )
            db.add(contact)
        
        # Atualiza contagem total
        campaign = db.get(Campaign, campaign_id)
        if campaign:
            campaign.total_contacts += len(contacts)
            db.commit()
            
    @staticmethod
    async def schedule_campaign(db: Session, campaign_id: int):
        """Marca a campanha como agendada para o Worker processar."""
        campaign = db.get(Campaign, campaign_id)
        if not campaign: return False
        
        campaign.status = CampaignStatus.SCHEDULED
        db.commit()
        
        # Disparo de Evento para o Worker (Via RabbitMQ - Sprint 36)
        from src.core.bus import rabbitmq_bus
        await rabbitmq_bus.publish(
            exchange_name="campaign_exchange",
            routing_key="campaign.start",
            message={"campaign_id": campaign_id, "tenant_id": campaign.tenant_id}
        )
        logger.info(f"🚀 Campanha {campaign_id} agendada para disparo.")
        return True
