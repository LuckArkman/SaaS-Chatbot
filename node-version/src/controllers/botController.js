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
      return res.json({ status: instance.status, qrcode: instance.qrcode_base64 });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Enviar status atual
    res.write(`data: ${JSON.stringify({ status: instance.status, qrcode: instance.qrcode_base64 })}\n\n`);

    // Aqui idealmente teríamos um EventEmitter escutando mudanças de QR para emitir, mas um polling simples de 2s serve para o MVP
    const interval = setInterval(async () => {
      const current = await WhatsAppInstance.findOne({ where: { id: instance.id } });
      res.write(`data: ${JSON.stringify({ status: current.status, qrcode: current.qrcode_base64 })}\n\n`);
    }, 2000);

    req.on('close', () => clearInterval(interval));

  } catch (e) {
    res.status(500).end();
  }
};

const startBot = async (req, res) => {
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    await whatsappService.initializeSession(instance.tenant_id, instance.session_name);
    return res.json({ status: 'starting', success: true });
  } catch (e) {
    logger.error(`[Bot] Erro start: ${e.message}`);
    return res.status(500).json({ detail: 'Falha ao iniciar sessão Baileys.' });
  }
};

const stopBot = async (req, res) => {
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    await whatsappService.deleteSession(req.tenantId, instance.session_name);
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
    await whatsappService.deleteSession(req.tenantId, instance.session_name);
    return res.json({ status: 'logged_out' });
  } catch (e) {
    return res.status(500).json({ detail: 'Falha ao deslogar sessão.' });
  }
};

module.exports = { getStatus, getQrStream, startBot, stopBot, restartBot, logoutBot };
