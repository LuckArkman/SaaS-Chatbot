from src.core.bus import rabbitmq_bus
from src.core.tenancy import set_current_tenant_id
from src.core.database import SessionLocal
from src.models.campaign import Campaign, CampaignContact, CampaignStatus
from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
from src.models.contact import Contact
from src.services.whatsapp_bridge_service import whatsapp_bridge
from loguru import logger
from datetime import datetime, timezone
import asyncio
import random
import uuid

class CampaignWorker:
    """
    Worker que processa campanhas em segundo plano.
    Replicando 'MassDisparadorTask' do .NET.
    """
    async def start(self):
        logger.info("📦 Iniciando Campaign Dispatcher em Segundo Plano...")

        # 🔒 Fila exclusiva com UUID para evitar Round-Robin entre multiplos workers
        worker_queue = f"campaign_processing_queue_{uuid.uuid4().hex[:8]}"

        await rabbitmq_bus.subscribe(
            queue_name=worker_queue,
            routing_key="campaign.start",
            exchange_name="campaign_exchange",
            callback=self.process_campaign,
            auto_delete=True,
            exclusive=True
        )
        logger.info(f"📦 CampaignWorker inscrito na fila exclusiva: '{worker_queue}'")

    async def process_campaign(self, payload: dict):
        """
        Processa o disparo massivo de uma campanha.
        Controla delays, erros e status de cada contato.

        CORRECAO PROBLEMA ARQUITETURAL #12:
        - Sessões Long-lived / Pool Exhaustion: O código anterior mantinha 
          "with SessionLocal() as db:" aberto por TODA a duracao do loop de contatos,
          que inclui operacoes de IO longo (request de disparo) e sleeps (delays de anti-ban).
          Isso prendia uma conexao preciosa do banco de dados na pool e impedia
          o avanco em assincronismo real, podendo esgotar a QueuePool em operacoes paralelas.
        - Refatorado para padrao Short-Lived Transactions: As operacoes no DB 
          limitam-se puramente a consulta inicial e ao commit final de cada interacao, 
          nunca mantendo O(n) chamadas de I/O de rede ou sleep(delay) bloqueando recursos do Postgres.
        """
        campaign_id = payload.get("campaign_id")
        tenant_id   = payload.get("tenant_id")

        if not campaign_id or not tenant_id:
            logger.warning(f"[CampaignWorker] Payload inválido: campaign_id={campaign_id}, tenant_id={tenant_id}")
            return

        set_current_tenant_id(tenant_id)

        # Transação Curta Inicial: Busca a configuração da campanha e contatos pendentes
        with SessionLocal() as db:
            campaign = db.get(Campaign, campaign_id)
            if not campaign:
                logger.error(f"❌ Campanha {campaign_id} não encontrada.")
                return

            if campaign.status not in [CampaignStatus.SCHEDULED, CampaignStatus.PAUSED]:
                logger.debug(f"[CampaignWorker] Campanha {campaign_id} ignorada (status={campaign.status.value})")
                return

            campaign.status = CampaignStatus.SENDING
            db.commit()

            campaign_name = campaign.name
            
            pending_contacts = db.query(CampaignContact.id, CampaignContact.phone_number).filter(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "pending"
            ).all()
            
        from collections import deque
        contacts_queue = deque([(c.id, c.phone_number) for c in pending_contacts])

        logger.info(f"📤 Disparo iniciado | campanha='{campaign_name}' | contatos={len(contacts_queue)}")

        bot_index = 0

        while contacts_queue:
            contact_id, phone_number = contacts_queue.popleft()
            
            silenced = False
            active_bots = []
            msg_template = ""
            min_delay = 5
            max_delay = 15

            # Transação Curta 2: Refresh de estado antes do dispatch individual
            with SessionLocal() as db:
                campaign = db.get(Campaign, campaign_id)
                if campaign.status in [CampaignStatus.PAUSED, CampaignStatus.CANCELED]:
                    logger.info(f"⏸️ Campanha {campaign_id} pausada/cancelada pelo usuário no meio da execução.")
                    return # Interrompe fluxo de processamento e libera o worker

                current_hour = datetime.now(timezone.utc).hour - 3
                if self._in_silence_window(campaign, current_hour):
                    silenced = True
                else:
                    msg_template = campaign.message_template
                    min_delay = campaign.min_delay
                    max_delay = campaign.max_delay

                    # Busca de bots refrescada no micro-ciclo caso haja DC indesejado
                    active_bots = [
                        b.session_name for b in db.query(WhatsAppInstance.session_name)
                        .filter(
                            WhatsAppInstance.tenant_id == tenant_id,
                            WhatsAppInstance.status == WhatsAppStatus.CONNECTED
                        ).all()
                    ]

            # ── Check de Silêncio e Bots Disponiveis EXT DA Session ──
            # 🔄 FIX CRÍTICO ANTIPADRÃO #19: 
            # O sistema antigo usava "continue" em um for-loop descartável. 
            # Isso obliterava silenciosamente o contato e travava a campanha ("SENDING" infinito).
            if silenced:
                logger.info(
                    f"😴 Campanha {campaign_id} em horário de silêncio "
                    f"(hora BR: {current_hour}h). Contato reposto na fila. Aguardando 1min..."
                )
                await asyncio.sleep(60)
                contacts_queue.append((contact_id, phone_number))
                continue

            if not active_bots:
                logger.error(f"❌ Nenhum bot CONECTADO para o Tenant {tenant_id}. Pausando campanha.")
                with SessionLocal() as db:
                    camp = db.get(Campaign, campaign_id)
                    camp.status = CampaignStatus.PAUSED
                    db.commit()
                return

            current_bot_session = active_bots[bot_index % len(active_bots)]
            bot_index += 1

            # ── CHAMADA ACYNC DE REDE (Sem ocupar conexão do DB) ──
            result = await whatsapp_bridge.send_message(
                session_key=current_bot_session,
                to=phone_number,
                content=msg_template
            )

            # Transação Curta 3: Gravação final do status da mensagem
            with SessionLocal() as db:
                campaign = db.get(Campaign, campaign_id)
                contact = db.get(CampaignContact, contact_id)
                
                if not contact or not campaign:
                    continue # Registros perdidos em runtime
                    
                if result.get("success") is True:
                    contact.status       = "sent"
                    contact.sent_at      = datetime.now(timezone.utc)
                    contact.message_id   = result.get("message_id")
                    campaign.sent_count += 1

                    lead = db.query(Contact).filter(
                        Contact.tenant_id    == tenant_id,
                        Contact.phone_number == phone_number
                    ).first()
                    if lead:
                        lead.last_campaign_id = campaign_id

                    logger.debug(
                        f"✅ Enviado | contato='{phone_number}' "
                        f"| msg_id='{result.get('message_id')}' | bot='{current_bot_session}'"
                    )
                else:
                    contact.status        = "error"
                    error_str = str(result.get("error", "Falha no disparo via Bridge"))
                    contact.error_message = error_str[:255] if error_str else "Falha Desconhecida"
                    campaign.error_count += 1

                    logger.warning(
                        f"⚠️ Falha no disparo | contato='{phone_number}' "
                        f"| erro='{contact.error_message}' | bot='{current_bot_session}'"
                    )

                db.commit()

            # ── ANTI-BAN SLEEP (Sem ocupar conexão do DB) ──
            delay = random.uniform(min_delay, max_delay)
            await asyncio.sleep(delay)

        # Transação Curta Final: Checkout da campanha inteira
        with SessionLocal() as db:
            campaign = db.get(Campaign, campaign_id)
            if campaign:
                total_processed = campaign.sent_count + campaign.error_count
                if total_processed >= campaign.total_contacts:
                    campaign.status = CampaignStatus.COMPLETED
                    logger.success(
                        f"🏁 Campanha '{campaign.name}' concluída | "
                        f"enviados={campaign.sent_count} | erros={campaign.error_count}"
                    )
                db.commit()

    @staticmethod
    def _in_silence_window(campaign: Campaign, current_hour: int) -> bool:
        """
        Verifica se o horario atual esta dentro da janela de silencio da campanha.

        Suporta dois tipos de intervalo:
          - Overnight (sleep_start > sleep_end): ex: 22h → 8h (atravessa meia-noite)
          - Diurno   (sleep_start < sleep_end):  ex: 13h → 15h (horario comercial)
        """
        if not hasattr(campaign, 'sleep_start') or not hasattr(campaign, 'sleep_end'):
            return False
        if campaign.sleep_start is None or campaign.sleep_end is None:
            return False
        if campaign.sleep_start == campaign.sleep_end:
            return False

        if campaign.sleep_start > campaign.sleep_end:
            # Overnight
            return current_hour >= campaign.sleep_start or current_hour < campaign.sleep_end
        else:
            # Diurno
            return campaign.sleep_start <= current_hour < campaign.sleep_end

campaign_worker = CampaignWorker()
