const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeLib = require('qrcode');
const axios = require('axios'); // Para baixar mídia de URLs

const logger = require('../utils/logger');
const Message = require('../models/nosql/Message');
const { WhatsAppInstance, Contact } = require('../models/sql/models');
const rabbitmqBus = require('../config/rabbitmq');
const connectionManager = require('../websockets/connectionManager');
const phoneUtils = require('../utils/phoneUtils');
const sessionMapper = require('../utils/sessionMapper');

class WhatsAppService {
  constructor() {
    this.clients = {}; // Armazena instâncias do whatsapp-web.js
  }

  // -------------------------------------------------------------------------
  // 1. INICIALIZAÇÃO DE SESSÃO
  // -------------------------------------------------------------------------
  async initializeSession(tenantId, sessionId) {
    if (this.clients[sessionId]) return;

    sessionMapper.associate(sessionId, `tenant_${tenantId}`);
    logger.info(`[*] Iniciando Puppeteer para tenant: ${tenantId} | session: ${sessionId}`);

    // Diretório base para as sessões (onde os perfis do Chrome serão salvos)
    const dataPath = path.join(__dirname, '..', '..', 'tokens');
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId, dataPath }),
      puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        headless: true
      }
    });

    this.clients[sessionId] = client;

    // --- EVENTOS DO CLIENT ---

    client.on('qr', async (qrStr) => {
      logger.info(`[${sessionId}] 📲 QR Code recebido.`);
      try {
        const qrBase64 = await qrcodeLib.toDataURL(qrStr);
        await WhatsAppInstance.update(
          { status: 'QRCODE', qrcode_base64: qrBase64 },
          { where: { session_name: sessionId, tenant_id: tenantId } }
        );
        connectionManager.broadcastToTenant(tenantId, {
          method: 'bot_status_update',
          action: 'bot_status_update',
          session_name: sessionId,
          status: 'QRCODE',
          qrcode: qrBase64
        });
      } catch (err) {
        logger.error(`[${sessionId}] Erro ao gerar QR Code: ${err.message}`);
      }
    });

    client.on('authenticated', () => {
      logger.info(`[${sessionId}] 🔐 Autenticado com sucesso.`);
    });

    client.on('auth_failure', async (msg) => {
      logger.error(`[${sessionId}] ❌ Falha de Autenticação: ${msg}`);
      await this.handleDisconnection(tenantId, sessionId, 'FALHA_AUTENTICACAO');
    });

    client.on('ready', async () => {
      logger.info(`[${sessionId}] ✅ Cliente pronto e conectado.`);
      await WhatsAppInstance.update(
        { status: 'CONNECTED', qrcode_base64: null, retries: 0 },
        { where: { session_name: sessionId, tenant_id: tenantId } }
      );
      connectionManager.broadcastToTenant(tenantId, {
        method: 'bot_status_update',
        action: 'bot_status_update',
        session_name: sessionId,
        status: 'CONNECTED'
      });

      // Sincroniza contatos iniciais (assíncrono)
      this.syncContactsToDb(tenantId, sessionId, client).catch(e => logger.error(e));
    });

    client.on('disconnected', async (reason) => {
      logger.warn(`[${sessionId}] 🔌 Desconectado do WhatsApp: ${reason}`);
      await this.handleDisconnection(tenantId, sessionId, reason);
    });

    client.on('message', async (msg) => {
      await this.handleIncomingMessage(tenantId, sessionId, client, msg);
    });

    // Iniciar
    try {
      await client.initialize();
    } catch (e) {
      logger.error(`[${sessionId}] Erro crítico ao inicializar client: ${e.message}`);
      await this.handleDisconnection(tenantId, sessionId, e.message);
    }
  }

  // -------------------------------------------------------------------------
  // 2. DESCONEXÃO E LIMPEZA
  // -------------------------------------------------------------------------
  async handleDisconnection(tenantId, sessionId, reason) {
    if (this.clients[sessionId]) {
      try { await this.clients[sessionId].destroy(); } catch (e) {}
      delete this.clients[sessionId];
    }
    
    // Atualiza DB se foi logout voluntário ou banimento
    const status = reason === 'LOGOUT' ? 'DISCONNECTED' : 'DISCONNECTED'; 
    await WhatsAppInstance.update(
      { status, qrcode_base64: null },
      { where: { session_name: sessionId, tenant_id: tenantId } }
    );
    
    connectionManager.broadcastToTenant(tenantId, {
      method: 'bot_status_update',
      action: 'bot_status_update',
      session_name: sessionId,
      status
    });
  }

  // -------------------------------------------------------------------------
  // 3. RECEBIMENTO DE MENSAGENS
  // -------------------------------------------------------------------------
  async handleIncomingMessage(tenantId, sessionId, client, msg) {
    // Ignora status (stories)
    if (msg.isStatus) return;
    
    const contact = await msg.getContact();
    const phone = phoneUtils.normalizeToDb(contact.number);
    if (!phoneUtils.isValidDbFormat(phone)) return;

    let messageType = msg.type; // 'chat', 'image', 'video', 'document', 'audio'
    let content = msg.body;
    let mediaUrl = null;

    // Se for mídia, processa (download e salvamento)
    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media) {
          // Salva mídia localmente usando storageService
          const storageService = require('./storageService');
          const savedUrl = await storageService.saveBase64Media(media.data, media.mimetype, tenantId);
          mediaUrl = savedUrl;
          if (!content) content = `[Mídia: ${messageType}]`;
        }
      } catch (e) {
        logger.error(`[${sessionId}] Erro ao baixar mídia da msg ${msg.id.id}: ${e.message}`);
        content = '[Falha ao carregar mídia]';
      }
    }

    // Identifica nome do contato
    const contactName = contact.name || contact.pushname || 'Desconhecido';

    // Salva ou Atualiza o Contato no Postgres
    try {
      await Contact.upsert({
        tenant_id: tenantId,
        phone_number: phone,
        full_name: contactName,
        is_active: true
      }, { returning: false });
    } catch (e) {
      logger.error(`[${sessionId}] Erro upsert contato: ${e.message}`);
    }

    // Salva Mensagem no MongoDB
    const payload = {
      tenant_id: tenantId,
      session_name: sessionId,
      contact_phone: phone,
      contact_name: contactName,
      content,
      source: 'user',
      message_type: messageType === 'chat' ? 'text' : messageType,
      media_url: mediaUrl,
      external_id: msg.id.id,
      ack: 0,
      timestamp: new Date()
    };

    try {
      await Message.create(payload);
      
      // Envia evento para o Frontend
      connectionManager.broadcastToTenant(tenantId, { ...payload, method: 'receive_message', action: 'receive_message' });

      // Despacha para AI via RabbitMQ
      const queuePayload = {
        tenant_id: tenantId,
        session_name: sessionId,
        contact_phone: phone,
        message: content,
        type: payload.message_type
      };
      await rabbitmqBus.publish('incoming_messages', queuePayload);

    } catch (e) {
      logger.error(`[${sessionId}] Erro DB: ${e.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. ENVIO DE MENSAGENS (TEXTO E MÍDIA)
  // -------------------------------------------------------------------------
  async sendMessage(sessionId, to, content, type = 'text', mediaUrl = null) {
    const client = this.clients[sessionId];
    if (!client) throw new Error(`Sessão ${sessionId} não está ativa.`);

    const formattedTo = phoneUtils.formatForWhatsApp(to);
    let sentMsg;

    try {
      if (type === 'text') {
        sentMsg = await client.sendMessage(formattedTo, content);
      } else if (mediaUrl) {
        // Envio de mídia
        let media;
        if (mediaUrl.startsWith('http')) {
          media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
        } else {
          // Arquivo local
          const localPath = path.join(__dirname, '..', '..', mediaUrl.replace(/^\//, ''));
          media = MessageMedia.fromFilePath(localPath);
        }
        sentMsg = await client.sendMessage(formattedTo, media, { caption: content || '' });
      } else {
        throw new Error('Tipo de mensagem inválido ou mídia não fornecida.');
      }

      return {
        success: true,
        external_id: sentMsg.id.id,
        timestamp: new Date()
      };
    } catch (e) {
      logger.error(`[${sessionId}] Falha envio: ${e.message}`);
      throw e;
    }
  }

  // -------------------------------------------------------------------------
  // 5. UTILITÁRIOS E GERENCIAMENTO
  // -------------------------------------------------------------------------
  getActiveSessionForTenant(tenantId) {
    const sessionId = sessionMapper.getSessionByTenant(`tenant_${tenantId}`);
    if (sessionId && this.clients[sessionId]) {
      return sessionId;
    }
    return null;
  }

  async initializeActiveSessions() {
    logger.info('🔄 Restaurando sessões ativas (whatsapp-web.js)...');
    try {
      const activeInstances = await WhatsAppInstance.findAll({
        where: { status: 'CONNECTED', is_active: true }
      });
      for (const instance of activeInstances) {
        logger.info(`Restaurando sessão CONNECTED: ${instance.session_name}`);
        await this.initializeSession(instance.tenant_id, instance.session_name);
      }
    } catch (error) {
      logger.error(`Falha ao restaurar sessões: ${error.message}`);
    }
  }

  // Sincronização inicial em background
  async syncContactsToDb(tenantId, sessionId, client) {
    logger.info(`[${sessionId}] 👤 Iniciando sincronização de contatos...`);
    try {
      const contacts = await client.getContacts();
      const validContacts = [];

      for (const c of contacts) {
        if (!c.isUser) continue;
        const phone = phoneUtils.normalizeToDb(c.number);
        if (!phoneUtils.isValidDbFormat(phone)) continue;
        validContacts.push({
          tenant_id: tenantId,
          phone_number: phone,
          full_name: c.name || c.pushname || 'Desconhecido',
          is_active: true
        });
      }

      if (validContacts.length > 0) {
        await Contact.bulkCreate(validContacts, {
          updateOnDuplicate: ['full_name'] // Apenas atualiza o nome se já existir
        });
        logger.info(`[${sessionId}] 👤 ${validContacts.length} contatos sincronizados.`);
      }
    } catch (e) {
      logger.error(`[${sessionId}] ❌ Erro na sync de contatos: ${e.message}`);
    }
  }

  async listContacts(sessionId) {
    const client = this.clients[sessionId];
    if (!client) throw new Error('Cliente inativo.');
    return await client.getContacts();
  }

  async getChatHistory(sessionId, phone, limit = 50) {
    const client = this.clients[sessionId];
    if (!client) throw new Error('Cliente inativo.');
    
    const formattedPhone = phoneUtils.formatForWhatsApp(phone);
    const chat = await client.getChatById(formattedPhone);
    const msgs = await chat.fetchMessages({ limit });
    return msgs;
  }

  // -------------------------------------------------------------------------
  // 6. CONTROLE MANUAL (Iniciado via Painel)
  // -------------------------------------------------------------------------
  async stopSession(tenantId, sessionId) {
    if (this.clients[sessionId]) {
      try { await this.clients[sessionId].destroy(); } catch (e) {}
      delete this.clients[sessionId];
    }
  }

  async logoutSession(tenantId, sessionId) {
    if (this.clients[sessionId]) {
      try { await this.clients[sessionId].logout(); } catch (e) {}
      delete this.clients[sessionId];
    }
  }

  // -------------------------------------------------------------------------
  // 7. CALLS (Não Suportado Pelo whatsapp-web.js nativamente)
  // -------------------------------------------------------------------------
  async makeCall(sessionId, phone, isVideo = false) {
    throw new Error('Chamadas de áudio/vídeo não são suportadas pela atual arquitetura do Web WhatsApp (Puppeteer).');
  }

  async rejectCall(sessionId, callId, callerJid) {
    // whatsapp-web.js rejeita automaticamente chamadas recebidas com 'rejectCall' event handler (opcional),
    // mas chamadas manuais para rejeitar via API ainda não possuem suporte 100% nativo.
    // Stub seguro.
    return { success: false, detail: 'Rejeição manual de chamadas não suportada.' };
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;

