const { Campaign, CampaignContact } = require('../models/sql/models');
const rabbitmqBus = require('../config/rabbitmq');
const logger = require('../utils/logger');
const phoneUtils = require('../utils/phoneUtils');

class CampaignService {
  static async createCampaign(tenantId, name, message) {
    const campaign = await Campaign.create({
      tenant_id: tenantId,
      name: name,
      message_template: message,
      status: 'draft'
    });
    logger.info(`📁 Campanha '${name}' criada para o Tenant ${tenantId}`);
    return campaign;
  }

  static async addContacts(campaignId, contactsArray, tenantId) {
    const campaign = await Campaign.findOne({ where: { id: campaignId, tenant_id: tenantId } });
    if (!campaign) {
      throw new Error('Campanha não localizada ou não pertence a este tenant.');
    }

    const records = contactsArray.map(phone => ({
      campaign_id: campaignId,
      phone_number: phoneUtils.normalizeToDb(phone),
      status: 'pending',
      tenant_id: tenantId
    }));

    await CampaignContact.bulkCreate(records);

    campaign.total_contacts += contactsArray.length;
    await campaign.save();
  }

  static async scheduleCampaign(campaignId, tenantId) {
    const campaign = await Campaign.findOne({ where: { id: campaignId, tenant_id: tenantId } });
    if (!campaign) return false;

    campaign.status = 'scheduled';
    await campaign.save();

    await rabbitmqBus.publish('campaign_exchange', 'campaign.start', {
      campaign_id: campaignId,
      tenant_id: tenantId
    });

    logger.info(`🚀 Campanha ${campaignId} agendada para disparo pelo tenant ${tenantId}.`);
    return true;
  }
}

module.exports = CampaignService;
