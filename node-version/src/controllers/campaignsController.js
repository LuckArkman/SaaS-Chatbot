const CampaignService = require('../services/campaignService');

const listCampaigns = async (req, res) => {
  res.json({ message: 'Rotas implementadas no backend' });
};

const createCampaign = async (req, res) => {
  const { name, message } = req.body;
  const camp = await CampaignService.createCampaign(req.tenantId, name, message);
  res.json(camp);
};

const scheduleCampaign = async (req, res) => {
  const { id } = req.params;
  
  if (!req.tenantId) {
    return res.status(401).json({ detail: 'Not authenticated or tenant context missing' });
  }

  const success = await CampaignService.scheduleCampaign(id, req.tenantId);
  if (!success) return res.status(404).json({ detail: 'Campanha não encontrada' });
  res.json({ success: true });
};

module.exports = { listCampaigns, createCampaign, scheduleCampaign };
