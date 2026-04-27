const { WhatsAppInstance } = require('../models/sql/models');
const whatsappService = require('../services/whatsappCore');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Helper interno (Substitui WhatsAppManagerService.get_or_create_instance)
const getOrCreateInstance = async (tenantId) => {
  let instance = await WhatsAppInstance.findOne();
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
    
    // Fallback: Se não for SSE, envia JSON estático (clientes PHP legados)
    if (!accept || !accept.includes('text/event-stream')) {
      return res.json({ status: instance.status, qrcode: instance.qrcode_base64 });
    }

    // Configura cabeçalhos Server-Sent Events (SSE)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let lastQr = null;

    // Em Node.js usamos um intervalo que checa o DB, ou escuta os eventos do WhatsappCore
    const intervalId = setInterval(async () => {
      try {
        const currentInstance = await WhatsAppInstance.findOne();
        if (!currentInstance) return;

        if (currentInstance.qrcode_base64 !== lastQr) {
          lastQr = currentInstance.qrcode_base64;
          res.write(`data: ${JSON.stringify({ status: currentInstance.status, qrcode: lastQr })}\n\n`);
        }

        if (['CONNECTED', 'DISCONNECTED'].includes(currentInstance.status)) {
          res.write(`data: ${JSON.stringify({ status: currentInstance.status, qrcode: null })}\n\n`);
          clearInterval(intervalId);
          res.end();
        }
      } catch (err) {
        clearInterval(intervalId);
        res.end();
      }
    }, 2000);

    req.on('close', () => clearInterval(intervalId));

  } catch (e) {
    res.status(500).end();
  }
};

const startBot = async (req, res) => {
  try {
    // const billingOk = await BillingService.checkPlanValidity(req.tenantId);
    // if (!billingOk) throw 402;
    
    const instance = await getOrCreateInstance(req.tenantId);
    
    // CHAMADA NATIVA: Em vez de HTTP pro Bridge, invoca o próprio monolito!
    whatsappService.initializeSession(req.tenantId, instance.session_name);
    
    await WhatsAppInstance.update({ status: 'CONNECTING' }, { where: { id: instance.id }});
    return res.json({ status: 'starting', success: true });
  } catch (e) {
    logger.error(`[Bot] Erro start: ${e.message}`);
    return res.status(500).json({ detail: 'Falha ao iniciar Baileys Nativo.' });
  }
};

const stopBot = async (req, res) => {
  try {
    const instance = await getOrCreateInstance(req.tenantId);
    const sock = whatsappService.sockets[instance.session_name];
    if (sock) {
      sock.end(undefined);
      delete whatsappService.sockets[instance.session_name];
    }
    await WhatsAppInstance.update({ status: 'DISCONNECTED', qrcode_base64: null }, { where: { id: instance.id }});
    
    return res.json({ status: 'stopped', success: true });
  } catch (e) {
    return res.status(500).json({ detail: 'Falha ao parar Baileys.' });
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
    const sock = whatsappService.sockets[instance.session_name];
    
    if (sock) {
      await sock.logout();
      delete whatsappService.sockets[instance.session_name];
    }
    
    // Destrói as chaves locais do Baileys
    const tokenPath = path.join(__dirname, '..', '..', 'tokens', instance.session_name);
    if (fs.existsSync(tokenPath)) {
      fs.rmSync(tokenPath, { recursive: true, force: true });
    }

    await WhatsAppInstance.update({ status: 'DISCONNECTED', qrcode_base64: null }, { where: { id: instance.id }});
    return res.json({ status: 'logged_out' });
  } catch (e) {
    return res.status(500).json({ detail: 'Falha ao deslogar.' });
  }
};

module.exports = { getStatus, getQrStream, startBot, stopBot, restartBot, logoutBot };
