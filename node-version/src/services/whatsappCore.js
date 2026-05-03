const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const qrcodeLib = require('qrcode');

const logger = require('../utils/logger');
const Message = require('../models/nosql/Message');
const { WhatsAppInstance, Contact } = require('../models/sql/models');
const rabbitmqBus = require('../config/rabbitmq');
const connectionManager = require('../websockets/connectionManager');

/**
 * Normaliza números para o padrão JID do WhatsApp
 */
function normalizeToJid(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith('55') && digits.length === 13 && digits[4] === '9') {
      const areaCode = digits.substring(2, 4);
      if (parseInt(areaCode) <= 27) {
        return `${digits}@s.whatsapp.net`;
      } else {
        return `55${areaCode}${digits.substring(5)}@s.whatsapp.net`;
      }
    }
    return `${digits}@s.whatsapp.net`;
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}@s.whatsapp.net`;
  }
  return `${digits}@s.whatsapp.net`;
}

class WhatsAppService {
  constructor() {
    this.sockets = {};
    this.stores = {};
    // Logger minimalista embutido para o Baileys não sujar o terminal
    this.baileysLogger = pino({ level: 'silent' });
  }

  async initializeSession(tenantId, sessionId) {
    if (this.sockets[sessionId]) return;

    logger.info(`[*] Iniciando Baileys Nativo para tenant: ${tenantId} | session: ${sessionId}`);

    const tokenPath = path.join(__dirname, '..', '..', 'tokens', sessionId);
    if (!fs.existsSync(tokenPath)) {
      fs.mkdirSync(tokenPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(tokenPath);
    const { version } = await fetchLatestBaileysVersion();

    // Store customizado assíncrono para evitar Memory Leaks e Event Loop Block (Sprint Bridge)
    const store = {
      messages: {}, chats: {}, contacts: {},
      bind(ev) {
        ev.on('chats.set', ({ chats }) => chats.forEach(c => this.chats[c.id] = c));
        ev.on('chats.upsert', (chats) => chats.forEach(c => this.chats[c.id] = { ...this.chats[c.id], ...c }));
        ev.on('contacts.set', ({ contacts }) => contacts.forEach(c => c.id && (this.contacts[c.id] = c)));
        ev.on('contacts.upsert', (contacts) => contacts.forEach(c => c.id && (this.contacts[c.id] = { ...this.contacts[c.id], ...c })));

        // Batching Assíncrono do Histórico (Portado fielmente da Etapa Anterior)
        ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
          logger.info(`[${sessionId}] 📚 Processando histórico massivo: chats=${chats?.length || 0}, msgs=${messages?.length || 0}`);
          const processBatch = async (items, processor) => {
            if (!items) return;
            for (let i = 0; i < items.length; i += 100) {
              items.slice(i, i + 100).forEach(processor);
              await new Promise(res => setImmediate(res)); // Yield CPU
            }
          };
          await processBatch(chats, c => this.chats[c.id] = c);
          await processBatch(contacts, c => c.id && (this.contacts[c.id] = c));
        });
      }
    };

    const sock = makeWASocket({
      version,
      logger: this.baileysLogger,
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.macOS('SaaS-Chatbot Monolith'),
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
    });

    store.bind(sock.ev);
    this.sockets[sessionId] = sock;
    this.stores[sessionId] = store;

    // Persistência de Chaves Criptográficas
    sock.ev.on('creds.update', saveCreds);

    // Eventos de Conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info(`[${sessionId}] 🟢 Novo QR Code gerado.`);
        try {
          const qrBase64 = await qrcodeLib.toDataURL(qr);
          await WhatsAppInstance.update(
            { status: 'QRCODE', qrcode_base64: qrBase64 },
            { where: { session_name: sessionId }, ignoreTenant: true }
          );
        } catch (e) {
          logger.error(`[${sessionId}] Erro ao converter QR para base64: ${e.message}`);
        }
        // Em um sistema real, dispararíamos um Socket.io broadcast aqui
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;

        logger.warn(`[${sessionId}] Conexão fechada. Motivo: ${lastDisconnect.error}. Reconectar? ${shouldReconnect}`);

        if (shouldReconnect) {
          await WhatsAppInstance.update(
            { status: 'CONNECTING' },
            { where: { session_name: sessionId }, ignoreTenant: true }
          );
          delete this.sockets[sessionId];
          setTimeout(() => this.initializeSession(tenantId, sessionId), 5000);
        } else {
          logger.error(`[${sessionId}] Sessão permanentemente deslogada.`);
          await WhatsAppInstance.update(
            { status: 'DISCONNECTED', qrcode_base64: null },
            { where: { session_name: sessionId }, ignoreTenant: true }
          );
          delete this.sockets[sessionId];
          fs.rmSync(tokenPath, { recursive: true, force: true });
        }
      } else if (connection === 'open') {
        logger.info(`[${sessionId}] ✅ WhatsApp Conectado e Sincronizado!`);
        await WhatsAppInstance.update(
          { status: 'CONNECTED', qrcode_base64: null },
          { where: { session_name: sessionId }, ignoreTenant: true }
        );
      }
    });

    // Evento Principal: Recebimento de Mensagens
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message) continue;

        const isFromMe = msg.key.fromMe;
        const remoteJid = msg.key.remoteJid;
        if (remoteJid === 'status@broadcast') continue; // Ignora status de WhatsApp

        const phone = remoteJid.split('@')[0];
        const pushName = msg.pushName || 'Contato Desconhecido';

        // Normalização Mínima de Texto
        let textContent = '';
        if (msg.message.conversation) textContent = msg.message.conversation;
        else if (msg.message.extendedTextMessage) textContent = msg.message.extendedTextMessage.text;
        else if (msg.message.imageMessage) textContent = '📷 [Imagem]';
        else if (msg.message.audioMessage) textContent = '🎵 [Áudio]';
        else textContent = '📦 [Mídia/Outro]';

        logger.info(`[${sessionId}] 📩 Mensagem Recebida de ${phone}: ${textContent.substring(0, 30)}`);

        // GRAVAÇÃO NO MONGOOSE COM PROTEÇÃO CONTRA DUPLICATAS OTIMISTAS
        try {
          if (isFromMe) {
            // Se foi enviada via API/Bot, a mensagem "otimista" já existe sem external_id
            const existingMsg = await Message.findOne({
              tenant_id: tenantId,
              contact_phone: phone,
              content: textContent,
              source: 'agent',
              external_id: null
            }).sort({ timestamp: -1 });

            if (existingMsg) {
              existingMsg.external_id = msg.key.id;
              existingMsg.ack = 1; // Enviado
              await existingMsg.save();
            } else {
              // Enviado direto do celular do usuário
              await Message.create({
                tenant_id: tenantId,
                session_name: sessionId,
                contact_phone: phone,
                contact_name: pushName,
                content: textContent,
                source: 'agent',
                message_type: 'text',
                external_id: msg.key.id,
                ack: 1
              });
            }
          } else {
            // Mensagem incoming de um usuário
            await Message.create({
              tenant_id: tenantId,
              session_name: sessionId,
              contact_phone: phone,
              contact_name: pushName,
              content: textContent,
              source: 'user',
              message_type: 'text',
              external_id: msg.key.id
            });
          }

          // BROADCAST WS EM TEMPO REAL PARA O FRONTEND
          let contactDisplayName = pushName;
          try {
            const localContact = await Contact.findOne({ where: { phone_number: phone, tenant_id: tenantId } });
            if (localContact && localContact.full_name) {
              contactDisplayName = localContact.full_name;
            }
          } catch (err) { }

          const socketPayload = {
            method: 'receive_message',
            params: {
              message_id: msg.key.id,
              conversation_id: phone,  // Usa o telefone normalizado (nunca o JID/LID bruto)
              contact_phone: phone,
              contact: {
                phone: phone,
                name: contactDisplayName,
                profile_picture: null
              },
              content: textContent,
              message_type: 'text',
              source: isFromMe ? 'agent' : 'user',
              from_me: isFromMe,
              side: isFromMe ? 'bot' : 'client',
              timestamp: new Date().toISOString()
            }
          };

          // Dispara para todos os usuários online do Tenant atual
          await connectionManager.broadcastToTenant(tenantId, socketPayload);

          // SE MENSAGEM DO USUÁRIO -> INSERE NA FILA DE FLOW (RabbitMQ)
          /* 
          // [REMOVIDO A PEDIDO DO USUÁRIO] - Desativa a auto-resposta de fluxo.
          if (!isFromMe) {
            await rabbitmqBus.publish('messages_exchange', 'message.incoming', {
              tenant_id: tenantId,
              session_name: sessionId,
              from: phone,
              name: contactDisplayName,
              content: textContent,
              message_id: msg.key.id
            });
          }
          */

        } catch (dbErr) {
          logger.error(`[${sessionId}] ❌ Erro ao processar mensagem localmente: ${dbErr.message}`);
        }
      }
    });
  }

  /**
   * Resolve o sessionId ativo em memória para um determinado tenantId.
   * Prioriza sessões autenticadas (sock.user != null). Garante que o controller
   * nunca dependa do PostgreSQL para descobrir a sessão correta.
   * @param {string} tenantId - ID do tenant (ex: 'FBEAE7DA')
   * @returns {string|null} sessionId ativo ou null se não encontrado
   */
  getActiveSessionForTenant(tenantId) {
    const prefix = `tenant_${tenantId.toUpperCase()}`;
    // Prioriza sessão autenticada
    const authenticatedSession = Object.keys(this.sockets).find(
      sessionId => sessionId.startsWith(prefix) && this.sockets[sessionId]?.user
    );
    // Fallback: qualquer sessão do tenant
    const anySession = Object.keys(this.sockets).find(
      sessionId => sessionId.startsWith(prefix)
    );
    return authenticatedSession || anySession || null;
  }

  /**
   * Envio de mensagens invocado pelos Workers ou API diretamente em memória
   */
  async sendMessage(sessionId, to, content) {
    const sock = this.sockets[sessionId];
    if (!sock) throw new Error(`Sessão ${sessionId} não está ativa na memória.`);
    if (!sock.user) throw new Error(`Sessão ${sessionId} não está autenticada (Aguardando QR Code).`);

    const jid = normalizeToJid(to);
    logger.info(`[${sessionId}] 📤 Enviando nativamente para ${jid}`);

    const result = await sock.sendMessage(jid, { text: content });
    return { success: !!result, message_id: result?.key?.id };
  }

  async listContacts(sessionId) {
    const store = this.stores[sessionId];
    if (!store) throw new Error(`Sessão ${sessionId} não está ativa.`);
    // O Baileys armazena os contatos na memória através do Store que injetamos
    return Object.values(store.contacts);
  }

  async verifyContact(sessionId, phone) {
    const sock = this.sockets[sessionId];
    if (!sock) throw new Error(`Sessão ${sessionId} não está ativa.`);
    const jid = normalizeToJid(phone);
    // onWhatsApp verifica se o número existe na rede do WhatsApp e retorna um array de matches
    const result = await sock.onWhatsApp(jid);
    return result && result.length > 0 ? result[0] : null;
  }
  async listChats(sessionId) {
    const store = this.stores[sessionId];
    if (!store) throw new Error(`Sessão ${sessionId} não está ativa.`);
    // O Baileys armazena as conversas na memória através do Store
    return Object.values(store.chats);
  }

  async getChatHistory(sessionId, phone, limit = 50) {
    const store = this.stores[sessionId];
    if (!store) throw new Error(`Sessão ${sessionId} não está ativa.`);
    const jid = normalizeToJid(phone);

    // O store.messages guarda arrays de mensagens indexados pelo JID
    const messages = store.messages[jid]?.array || [];
    // Retorna as últimas N mensagens
    return messages.slice(-limit);
  }

  /**
   * Restaura todas as sessões que estavam marcadas como CONNECTED no banco ao reiniciar o servidor
   */
  async initializeActiveSessions() {
    logger.info('🔄 Procurando sessões do WhatsApp para restaurar...');
    try {
      const activeInstances = await WhatsAppInstance.findAll({
        where: {
          is_active: true,
          status: ['CONNECTED', 'QRCODE', 'CONNECTING']
        }
      });

      for (const instance of activeInstances) {
        logger.info(`🔄 Restaurando sessão do tenant '${instance.tenant_id}' (${instance.session_name})...`);

        // Coloca como conectando para evitar inconsistências
        await instance.update({ status: 'CONNECTING' });

        // Inicia
        this.initializeSession(instance.tenant_id, instance.session_name);
      }
      logger.info(`✅ ${activeInstances.length} sessões enviadas para inicialização.`);
    } catch (e) {
      logger.error(`❌ Erro ao restaurar sessões: ${e.message}`);
    }
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
