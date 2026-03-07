from src.core.bus import rabbitmq_bus
from src.core.tenancy import set_current_tenant_id
from src.core.database import SessionLocal
from src.models.campaign import Campaign, CampaignContact, CampaignStatus
from src.services.whatsapp_bridge_service import whatsapp_bridge
from loguru import logger
import asyncio
import random

class CampaignWorker:
    """
    Worker que processa campanhas em segundo plano.
    Replicando 'MassDisparadorTask' do .NET.
    """
    async def start(self):
        logger.info("📦 Iniciando Campaign Dispatcher em Segundo Plano...")
        
        await rabbitmq_bus.subscribe(
            queue_name="campaign_processing_queue",
            routing_key="campaign.start",
            exchange_name="campaign_exchange",
            callback=self.process_campaign
        )

    async def process_campaign(self, payload: dict):
        """
        Processa o disparo massivo de uma campanha.
        Controla delays, erros e status de cada contato.
        """
        campaign_id = payload.get("campaign_id")
        tenant_id = payload.get("tenant_id")
        
        if not campaign_id or not tenant_id:
            return

        set_current_tenant_id(tenant_id)
        
        with SessionLocal() as db:
            campaign = db.query(Campaign).get(campaign_id)
            if not campaign:
                logger.error(f"❌ Campanha {campaign_id} não encontrada para o worker.")
                return

            if campaign.status not in [CampaignStatus.SCHEDULED, CampaignStatus.PAUSED]:
                return
            
            campaign.status = CampaignStatus.SENDING
            db.commit()
            
            # Recupera Contatos Pendentes
            contacts = db.query(CampaignContact).filter(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "pending"
            ).all()

            logger.info(f"📤 Iniciando disparo de {len(contacts)} contatos na campanha '{campaign.name}'")
            
            # --- 🟢 Rotação de Dispositivos (Sprint 38) ---
            from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
            active_bots = db.query(WhatsAppInstance).filter(
                WhatsAppInstance.tenant_id == tenant_id,
                WhatsAppInstance.status == WhatsAppStatus.CONNECTED
            ).all()
            
            if not active_bots:
                logger.error(f"❌ Nenhum bot CONECTADO para o Tenant {tenant_id}. Pausando campanha.")
                campaign.status = CampaignStatus.PAUSED
                db.commit()
                return

            bot_index = 0
            
            for contact in contacts:
                # 🟢 Check se a campanha foi pausada/cancelada no meio
                db.refresh(campaign)
                if campaign.status in [CampaignStatus.PAUSED, CampaignStatus.CANCELED]:
                    logger.info(f"⏸️ Campanha {campaign_id} pausada/cancelada pelo usuário.")
                    break

                # 🟢 Check Horários de Silêncio (Sprint 38)
                current_hour = datetime.utcnow().hour - 3 # Ajuste UTC-3 (Exemplo BR)
                if campaign.sleep_start > campaign.sleep_end: # Overnight: 22 -> 8
                    if current_hour >= campaign.sleep_start or current_hour < campaign.sleep_end:
                        logger.info(f"😴 Campanha {campaign_id} em horário de silêncio. Aguardando...")
                        await asyncio.sleep(600) # Dorme 10 min e reavalia
                        continue
                else: # Day interval: 8 -> 17
                    if campaign.sleep_start <= current_hour < campaign.sleep_end:
                         logger.info(f"😴 Campanha {campaign_id} em horário de silêncio configurado.")
                         await asyncio.sleep(600)
                         continue

                # 🟢 Disparo Real com Rotação (Round Robin)
                current_bot = active_bots[bot_index % len(active_bots)]
                bot_index += 1
                
                success = await whatsapp_bridge.send_message(
                    session_key=current_bot.session_name,
                    to=contact.phone_number,
                    content=campaign.message_template
                )
                
                if success:
                    contact.status = "sent"
                    contact.sent_at = asyncio.get_event_loop().time() 
                    campaign.sent_count += 1
                    
                    # 🟢 Track Attribution (Sprint 39)
                    from src.models.contact import Contact
                    lead = db.query(Contact).filter(
                        Contact.tenant_id == tenant_id,
                        Contact.phone_number == contact.phone_number
                    ).first()
                    if lead:
                        lead.last_campaign_id = campaign_id
                else:
                    contact.status = "error"
                    contact.error_message = "Falha no disparo via Bridge"
                    campaign.error_count += 1
                
                db.commit()
                
                # --- 🟢 Lógica de Anti-Ban (Sprint 38) ---
                # Delays variados para simular comportamento humano
                delay = random.uniform(campaign.min_delay, campaign.max_delay)
                await asyncio.sleep(delay)

            # --- Finalização ---
            if campaign.sent_count + campaign.error_count >= campaign.total_contacts:
                campaign.status = CampaignStatus.COMPLETED
                logger.success(f"🏁 Campanha {campaign_id} concluída: {campaign.sent_count} Enviadas, {campaign.error_count} Erros.")
            
            db.commit()

campaign_worker = CampaignWorker()
