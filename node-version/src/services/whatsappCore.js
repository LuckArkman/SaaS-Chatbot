const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { WhatsAppInstance } = require('../models/sql/models');
const { initWASocket, getWbot, removeWbot } = require('../libs/wbot');
const { wbotMessageListener } = require('./wbotMessageListener');

class WhatsAppBaileysService {
  constructor() {}

  async initializeSession(tenantId, sessionId) {
    logger.info(`[*] Sincronizando Baileys para tenant: ${tenantId}`);
    
    try {
      let instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId, session_name: sessionId } });
      if (!instance) {
        instance = await WhatsAppInstance.create({
          tenant_id: tenantId,
          session_name: sessionId,
          status: 'CONNECTING'
        });
      } else {
        await instance.update({ status: 'CONNECTING' });
      }

      const wsocket = await initWASocket(instance.id, tenantId, sessionId);
      
      // Adiciona o listener
      wbotMessageListener(wsocket, tenantId, sessionId);

      return { success: true, message: 'Sessão inicializada ou conectada' };
    } catch (err) {
      logger.error(`[${sessionId}] Erro ao iniciar Baileys: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async getSessionStatus(tenantId, sessionId) {
    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId, session_name: sessionId } });
    if (!instance) return null;
    return instance.status;
  }

  async getSessionQrCode(tenantId, sessionId) {
    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId, session_name: sessionId } });
    if (!instance) return null;
    return instance.qrcode_base64;
  }

  async deleteSession(tenantId, sessionId) {
    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId, session_name: sessionId } });
    if (instance) {
      await removeWbot(instance.id);
      const sessionDir = path.join(__dirname, '..', '..', 'sessions', `${tenantId}_${sessionId}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      await instance.destroy();
      return true;
    }
    return false;
  }

  getActiveSessionForTenant(tenantId) {
    return `tenant_${tenantId.toUpperCase()}`; // Simulação de sessionId caso não seja dinâmico
  }

  async sendMessage(tenantId, to, content, type = 'text', mediaUrl = null) {
    logger.info(`[Tenant:${tenantId}] 📤 Enviando mensagem (${type}) nativa para ${to}`);
    try {
      const sessionId = this.getActiveSessionForTenant(tenantId);
      const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId, session_name: sessionId } });
      if (!instance) throw new Error('Sessão não encontrada no DB');

      const wsocket = getWbot(instance.id);
      
      let remoteJid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      
      let payload = {};

      if (type === 'text') {
        payload = { text: content };
      } else if (mediaUrl) {
        // Se for url remota, baileys tem que baixar. Se for arquivo local, ler do disco.
        if (mediaUrl.startsWith('http')) {
          payload = {
            [type]: { url: mediaUrl },
            caption: content
          };
        } else {
          payload = {
            [type]: fs.readFileSync(mediaUrl),
            caption: content
          };
        }
      }

      const result = await wsocket.sendMessage(remoteJid, payload);
      return { success: true, message_id: result?.key?.id };
    } catch (err) {
      logger.error(`Falha ao enviar mensagem Baileys: ${err.message}`);
      return { success: false };
    }
  }

  async initializeActiveSessions() {
    logger.info('🔄 Inicializando todas as instâncias ativas do Baileys no DB...');
    const instances = await WhatsAppInstance.findAll({ where: { is_active: true } });
    for (const inst of instances) {
      logger.info(`Inicializando sessão salva: ${inst.session_name} (Tenant: ${inst.tenant_id})`);
      await this.initializeSession(inst.tenant_id, inst.session_name);
    }
  }
}

module.exports = new WhatsAppBaileysService();
