const { WhatsAppInstance } = require('../models/sql/models');
const whatsappService = require('../services/whatsappCore');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const getOrCreateInstance = async (tenantId) => {
  let instance = await WhatsAppInstance.findOne({ 
    where: { tenant_id: tenantId },
    order: [['id', 'DESC']]
  });
  if (!instance) {
    const sessionName = `tenant_${tenantId}`;
    instance = await WhatsAppInstance.create({
      session_name: sessionName,
      tenant_id: tenantId,
      status: 'DISCONNECTED'
    });
  }
  return instance;
};

const getStatus = async (req, res) => {
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    return res.json(instance);
  } catch (e) {
    return res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getQrStream = async (req, res) => {
  const accept = req.headers['accept'];
  
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    
    if (!accept || !accept.includes('text/event-stream')) {
      return res.json({ status: instance.status, qrcode: null });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Na Cloud API não há geração de QR Code, enviamos o status atual e encerramos.
    res.write(`data: ${JSON.stringify({ status: instance.status, qrcode: null })}\n\n`);
    res.end();

  } catch (e) {
    res.status(500).end();
  }
};

const startBot = async (req, res) => {
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    
    // Na API oficial, "Start" significa apenas marcar como conectado se houver chaves.
    if (!instance.cloud_api_token || !instance.cloud_phone_id) {
      // Retorna erro se o usuário não tiver configurado as chaves
      return res.status(400).json({ detail: 'Configure o Token e ID da Cloud API primeiro.' });
    }

    await WhatsAppInstance.update({ status: 'CONNECTED' }, { where: { id: instance.id }});
    return res.json({ status: 'starting', success: true });
  } catch (e) {
    logger.error(`[Bot] Erro start: ${e.message}`);
    return res.status(500).json({ detail: 'Falha ao iniciar Cloud API.' });
  }
};

const stopBot = async (req, res) => {
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    await WhatsAppInstance.update({ status: 'DISCONNECTED' }, { where: { id: instance.id }});
    
    return res.json({ status: 'stopped', success: true });
  } catch (e) {
    return res.status(500).json({ detail: 'Falha ao parar.' });
  }
};

const restartBot = async (req, res) => {
  try {
    await stopBot(req, { json: () => {} });
    await startBot(req, { json: () => {} });
    return res.json({ status: 'restarting', success: true });
  } catch (e) {
    return res.status(500).json({ detail: 'Falha ao reiniciar.' });
  }
};

const logoutBot = async (req, res) => {
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    // Logout apenas limpa as credenciais locais e desconecta
    await WhatsAppInstance.update({ 
      status: 'DISCONNECTED', 
      cloud_api_token: null, 
      cloud_phone_id: null 
    }, { where: { id: instance.id }});
    
    return res.json({ status: 'logged_out' });
  } catch (e) {
    return res.status(500).json({ detail: 'Falha ao deslogar Cloud API.' });
  }
};

module.exports = { getStatus, getQrStream, startBot, stopBot, restartBot, logoutBot };
