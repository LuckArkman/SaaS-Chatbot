const axios = require('axios');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { WhatsAppInstance } = require('../models/sql/models');
const phoneUtils = require('../utils/phoneUtils');
const sessionMapper = require('../utils/sessionMapper');

class WhatsAppCloudService {
  constructor() {
    this.graphApiVersion = 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  async getCredentials(tenantId) {
    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId } });
    if (!instance || !instance.cloud_api_token || !instance.cloud_phone_id) {
      throw new Error('Credenciais da Cloud API não configuradas para este Tenant.');
    }
    return {
      token: instance.cloud_api_token,
      phoneId: instance.cloud_phone_id,
      sessionId: instance.session_name
    };
  }

  async getCloudClient(tenantId) {
    const creds = await this.getCredentials(tenantId);
    return {
      client: axios.create({
        baseURL: `${this.baseUrl}/${creds.phoneId}`,
        headers: {
          'Authorization': `Bearer ${creds.token}`,
          'Content-Type': 'application/json'
        }
      }),
      phoneId: creds.phoneId,
      sessionId: creds.sessionId
    };
  }

  async initializeSession(tenantId, sessionId) {
    // Na Cloud API, não precisamos "iniciar" a sessão. 
    // Apenas garantimos que o mapeamento e status estejam OK no banco.
    sessionMapper.associate(sessionId, `tenant_${tenantId}`);
    logger.info(`[*] Sincronizando Cloud API para tenant: ${tenantId}`);
    
    try {
      await WhatsAppInstance.update(
        { status: 'CONNECTED' },
        { where: { session_name: sessionId } }
      );
    } catch (err) {
      logger.error(`[${sessionId}] Erro ao atualizar status: ${err.message}`);
    }
  }

  getActiveSessionForTenant(tenantId) {
    return `tenant_${tenantId.toUpperCase()}`;
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  async sendMessage(tenantId, to, content, type = 'text', mediaUrl = null) {
    logger.info(`[Tenant:${tenantId}] 📤 Enviando mensagem (${type}) via Cloud API para ${to}`);
    try {
      const { client, sessionId } = await this.getCloudClient(tenantId);
      
      // Cloud API exige DDI completo, ex: 5511999999999. Sem sufixo @c.us
      let phone = to.split('@')[0];
      
      let payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone
      };

      if (type === 'text') {
        payload.type = 'text';
        payload.text = { preview_url: false, body: content };
      } else {
        // Envio de Mídia: WhatsApp Cloud API aceita link ou Media ID
        // Para simplificar esta primeira versão, suportaremos link direto ou upload
        
        let fileIdOrLink = null;

        if (mediaUrl && mediaUrl.startsWith('http')) {
           fileIdOrLink = { link: mediaUrl };
        } else if (mediaUrl) {
           // Aqui você teria que fazer o upload da mídia local primeiro usando o endpoint de media
           // e usar o Media ID. Para MVP simplificado, retornamos erro se for arquivo local
           // sem ter sido subido para uma URL acessível.
           throw new Error('Upload de arquivo local direto requer POST para /media na Cloud API. Use URLs públicas no momento.');
        }

        payload.type = type; // image, video, audio, document
        payload[type] = fileIdOrLink;
        if (content) {
          payload[type].caption = content;
        }
      }

      const result = await client.post('/messages', payload);
      const msgId = result.data.messages ? result.data.messages[0].id : null;
      return { success: true, message_id: msgId };
    } catch (err) {
      logger.error(`Falha ao enviar mensagem Cloud API: ${err.response?.data?.error?.message || err.message}`);
      return { success: false };
    }
  }

  async sendTemplateMessage(tenantId, to, templateName, languageCode = 'pt_BR', components = []) {
    logger.info(`[Tenant:${tenantId}] 📤 Enviando template ${templateName} via Cloud API para ${to}`);
    try {
      const { client } = await this.getCloudClient(tenantId);
      let phone = to.split('@')[0];
      
      let payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components
        }
      };

      const result = await client.post('/messages', payload);
      return { success: true, message_id: result.data.messages[0].id };
    } catch (err) {
      logger.error(`Falha ao enviar template: ${err.response?.data?.error?.message || err.message}`);
      return { success: false };
    }
  }

  async makeCall(sessionId, phone, isVideo = false) {
    return { id: 'simulated_call', simulated: true };
  }

  async rejectCall(sessionId, callId, callerJid) {
    return false;
  }

  async listContacts(sessionId) { return []; }
  async verifyContact(sessionId, phone) { return null; }
  async listChats(sessionId) { return []; }
  async getChatHistory(sessionId, phone, limit = 50) { return []; }
  async requestHistoryFromWhatsApp(sessionId, phone, count = 50, waitMs = 8000) { return false; }
  
  async initializeActiveSessions() {
    logger.info('🔄 Cloud API gerencia conexões nativamente pela Meta.');
  }
}

module.exports = new WhatsAppCloudService();
