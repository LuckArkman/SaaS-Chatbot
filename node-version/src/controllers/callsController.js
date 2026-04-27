const whatsappService = require('../services/whatsappCore');
const { WhatsAppInstance } = require('../models/sql/models');
const logger = require('../utils/logger');

const getConnectedInstance = async (tenantId) => {
  const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId }});
  if (!instance || instance.status !== 'connected') {
    throw new Error('O agente WhatsApp não está conectado. Conecte o bot antes de usar chamadas.');
  }
  return instance;
};

const startCall = async (req, res) => {
  const { phone_number } = req.body;
  try {
    const instance = await getConnectedInstance(req.tenantId);
    
    logger.info(`[Calls][Tenant:${req.tenantId}] Solicitada chamada de voz para ${phone_number}`);
    
    // Chamada Nativa Baileys no Memory Monolith
    const result = await whatsappService.makeCall(instance.session_name, phone_number);
    
    if (!result) {
      return res.status(502).json({ detail: 'Falha ao iniciar chamada via Bridge Nativo.' });
    }
    
    return res.status(202).json({
      success: true,
      status: 'calling',
      call_id: result.id,
      to: phone_number
    });

  } catch (e) {
    return res.status(409).json({ detail: e.message });
  }
};

const rejectCall = async (req, res) => {
  const { call_id, caller_jid } = req.body;
  try {
    const instance = await getConnectedInstance(req.tenantId);

    logger.info(`[Calls][Tenant:${req.tenantId}] Rejeitou chamada ${call_id} de ${caller_jid}`);
    
    // Chamada Nativa
    const result = await whatsappService.rejectCall(instance.session_name, call_id, caller_jid);
    
    if (!result) {
      return res.status(502).json({ detail: 'Falha ao rejeitar chamada.' });
    }

    return res.status(200).json({
      success: true,
      status: 'rejected',
      call_id
    });
  } catch (e) {
    return res.status(409).json({ detail: e.message });
  }
};

module.exports = { startCall, rejectCall };
