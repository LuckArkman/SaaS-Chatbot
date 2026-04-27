const { Campaign, CampaignContact } = require('../models/sql/models');
const rabbitmqBus = require('../config/rabbitmq');
const logger = require('../utils/logger');

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
    const records = contactsArray.map(phone => ({
      campaign_id: campaignId,
      phone_number: phone,
      status: 'pending',
      tenant_id: tenantId
    }));

    await CampaignContact.bulkCreate(records);

    const campaign = await Campaign.findByPk(campaignId);
    if (campaign) {
      campaign.total_contacts += contactsArray.length;
      await campaign.save();
    }
  }

  static async scheduleCampaign(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) return false;

    campaign.status = 'scheduled';
    await campaign.save();

    await rabbitmqBus.publish('campaign_exchange', 'campaign.start', {
      campaign_id: campaignId,
      tenant_id: campaign.tenant_id
    });

    logger.info(`🚀 Campanha ${campaignId} agendada para disparo.`);
    return true;
  }
}

module.exports = CampaignService;
