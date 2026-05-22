const rabbitmqBus = require('../config/rabbitmq');
const { Campaign, CampaignContact, WhatsAppInstance, Contact } = require('../models/sql/models');
const { tenancyContext } = require('../middlewares/tenancyMiddleware');
const whatsappService = require('../services/whatsappCore');
const logger = require('../utils/logger');

class CampaignWorker {
  async start() {
    logger.info('📦 Iniciando Campaign Dispatcher em Segundo Plano...');
    
    await rabbitmqBus.subscribe('campaign_processing_queue', 'campaign_exchange', 'campaign.start', this.processCampaign.bind(this));
  }

  async processCampaign(payload) {
    const { campaign_id, tenant_id } = payload;
    if (!campaign_id || !tenant_id) return;

    // Executa no contexto do Tenant isolado
    tenancyContext.run({ tenantId: tenant_id.toUpperCase() }, async () => {
      try {
        const campaign = await Campaign.findByPk(campaign_id);
        if (!campaign) return;

        if (!['scheduled', 'paused'].includes(campaign.status)) return;

        campaign.status = 'sending';
        await campaign.save();

        const contacts = await CampaignContact.findAll({
          where: { campaign_id: campaign_id, status: 'pending' }
        });

        logger.info(`📤 Iniciando disparo de ${contacts.length} contatos na campanha '${campaign.name}'`);

        // Busca instâncias ativas
        const activeBots = await WhatsAppInstance.findAll({
          where: { status: 'connected' } // O tenancy context garante que pega só os desse tenant
        });

        if (activeBots.length === 0) {
          logger.error(`❌ Nenhum bot CONECTADO para o Tenant ${tenant_id}. Pausando campanha.`);
          campaign.status = 'paused';
          await campaign.save();
          return;
        }

        let botIndex = 0;

        for (const contact of contacts) {
          // Checa pausa/cancelamento
          await campaign.reload();
          if (['paused', 'canceled'].includes(campaign.status)) {
            logger.info(`⏸️ Campanha ${campaign_id} pausada/cancelada.`);
            break;
          }

          // Checa horário de silêncio
          const currentHour = new Date().getHours(); 
          if (campaign.sleep_start > campaign.sleep_end) {
            if (currentHour >= campaign.sleep_start || currentHour < campaign.sleep_end) {
              logger.info(`😴 Horário de silêncio. Pausando fluxo da campanha ${campaign_id}.`);
              await new Promise(resolve => setTimeout(resolve, 600000)); // 10 min
              continue;
            }
          } else {
            if (currentHour >= campaign.sleep_start && currentHour < campaign.sleep_end) {
              await new Promise(resolve => setTimeout(resolve, 600000));
              continue;
            }
          }

          const currentBot = activeBots[botIndex % activeBots.length];
          botIndex++;

          // Disparo Nativo (Substitui Bridge)
          try {
            await whatsappService.sendMessage(currentBot.session_name, contact.phone_number, campaign.message_template);
            
            contact.status = 'sent';
            contact.sent_at = new Date();
            campaign.sent_count += 1;

            // Atribuição de Lead
            const lead = await Contact.findOne({ where: { phone_number: contact.phone_number }});
            if (lead) {
              lead.last_campaign_id = campaign_id;
              await lead.save();
            }

          } catch (e) {
            contact.status = 'error';
            contact.error_message = e.message;
            campaign.error_count += 1;
          }

          await contact.save();
          await campaign.save();

          // Anti-Ban Delay Randomizado
          const delayMs = Math.floor(Math.random() * (campaign.max_delay - campaign.min_delay + 1) + campaign.min_delay) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        if (campaign.sent_count + campaign.error_count >= campaign.total_contacts) {
          campaign.status = 'completed';
          logger.info(`🏁 Campanha ${campaign_id} concluída.`);
        }
        await campaign.save();

      } catch (err) {
        logger.error(`[CampaignWorker] Erro no fluxo: ${err.message}`);
      }
    });
  }
}

module.exports = new CampaignWorker();
