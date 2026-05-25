const whatsappService = require('../services/whatsappCore');
const { WhatsAppInstance, CallLog } = require('../models/sql/models');
const logger = require('../utils/logger');
const phoneUtils = require('../utils/phoneUtils');
const connectionManager = require('../websockets/connectionManager');

const getConnectedInstance = async (tenantId) => {
  const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId }});
  if (!instance || instance.status !== 'CONNECTED') { // Baileys status standard is CONNECTED
    throw new Error('O agente WhatsApp não está conectado. Conecte o bot antes de usar chamadas.');
  }
  return instance;
};

const startCall = async (req, res) => {
  const { phone_number, is_video = false } = req.body;
  
  if (!phone_number) {
    return res.status(400).json({ error: 'O número de telefone é obrigatório.' });
  }

  try {
    const instance = await getConnectedInstance(req.tenantId);
    const cleanPhone = phoneUtils.normalizeToDb(phone_number);

    logger.info(`[Calls][Tenant:${req.tenantId}] Solicitada chamada de ${is_video ? 'vídeo' : 'voz'} para ${cleanPhone}`);
    
    // Dispara sinalização no Baileys
    const result = await whatsappService.makeCall(instance.session_name, cleanPhone, is_video);
    
    if (!result) {
      return res.status(502).json({ detail: 'Falha ao iniciar chamada via Bridge Nativo.' });
    }

    // Grava log de chamada ativa
    await CallLog.create({
      tenant_id: req.tenantId,
      contact_phone: cleanPhone,
      call_id: result.id,
      type: is_video ? 'video' : 'voice',
      direction: 'outgoing',
      status: 'ringing'
    });

    // Notifica operadores via WebSocket RPC
    await connectionManager.publishEvent(req.tenantId, {
      method: 'call_outgoing',
      params: {
        call_id: result.id,
        contact_phone: cleanPhone,
        is_video: is_video,
        status: 'ringing',
        timestamp: new Date().toISOString()
      }
    });
    
    return res.status(202).json({
      success: true,
      status: 'calling',
      call_id: result.id,
      to: cleanPhone
    });

  } catch (e) {
    logger.error(`[Calls] Erro startCall: ${e.message}`);
    return res.status(409).json({ detail: e.message });
  }
};

const acceptCall = async (req, res) => {
  const { call_id, caller_jid } = req.body;
  try {
    const log = await CallLog.findOne({ where: { call_id: call_id, tenant_id: req.tenantId } });
    if (!log) {
      return res.status(404).json({ error: 'Chamada não localizada.' });
    }

    log.status = 'accepted';
    await log.save();

    logger.info(`[Calls][Tenant:${req.tenantId}] Chamada ${call_id} aceita na UI.`);

    // Transmite aceitação via WS
    await connectionManager.publishEvent(req.tenantId, {
      method: 'call_accepted',
      params: {
        call_id: call_id,
        status: 'accepted',
        timestamp: new Date().toISOString()
      }
    });

    return res.json({ success: true, status: 'accepted' });
  } catch (e) {
    return res.status(409).json({ detail: e.message });
  }
};

const rejectCall = async (req, res) => {
  const { call_id, caller_jid } = req.body;
  try {
    const instance = await getConnectedInstance(req.tenantId);
    const cleanJid = caller_jid || (await CallLog.findOne({ where: { call_id: call_id, tenant_id: req.tenantId } }))?.contact_phone;

    if (!cleanJid) {
      return res.status(400).json({ error: 'Destinatário/JID da chamada é obrigatório para rejeição.' });
    }

    logger.info(`[Calls][Tenant:${req.tenantId}] Rejeitou chamada ${call_id} de ${cleanJid}`);
    
    // Dispara a rejeição oficial no Baileys
    await whatsappService.rejectCall(instance.session_name, call_id, cleanJid);
    
    const log = await CallLog.findOne({ where: { call_id: call_id, tenant_id: req.tenantId } });
    if (log) {
      log.status = 'rejected';
      await log.save();
    }

    // Comunica WS
    await connectionManager.publishEvent(req.tenantId, {
      method: 'call_ended',
      params: {
        call_id: call_id,
        status: 'rejected',
        timestamp: new Date().toISOString()
      }
    });

    return res.json({
      success: true,
      status: 'rejected',
      call_id
    });
  } catch (e) {
    return res.status(409).json({ detail: e.message });
  }
};

const endCall = async (req, res) => {
  const { call_id, caller_jid } = req.body;
  try {
    const instance = await getConnectedInstance(req.tenantId);
    
    const log = await CallLog.findOne({ where: { call_id: call_id, tenant_id: req.tenantId } });
    if (!log) {
      return res.status(404).json({ error: 'Chamada não localizada.' });
    }

    // Calcula duração da chamada
    const now = new Date();
    const start = new Date(log.updated_at || log.created_at);
    const durationSeconds = Math.round((now - start) / 1000);
    
    log.status = 'ended';
    log.duration = durationSeconds > 0 ? durationSeconds : 0;
    await log.save();

    logger.info(`[Calls][Tenant:${req.tenantId}] Chamada ${call_id} encerrada. Duração: ${log.duration}s`);

    // Tenta rejeitar/desligar no Baileys por precaução
    const cleanJid = caller_jid || log.contact_phone;
    try {
      await whatsappService.rejectCall(instance.session_name, call_id, cleanJid);
    } catch (e) {
      // Ignora falhas se a chamada já tiver sido encerrada no celular
    }

    // Notifica encerramento no WS
    await connectionManager.publishEvent(req.tenantId, {
      method: 'call_ended',
      params: {
        call_id: call_id,
        status: 'ended',
        duration: log.duration,
        timestamp: now.toISOString()
      }
    });

    return res.json({ success: true, status: 'ended', duration: log.duration });
  } catch (e) {
    return res.status(409).json({ detail: e.message });
  }
};

module.exports = { startCall, acceptCall, rejectCall, endCall };
