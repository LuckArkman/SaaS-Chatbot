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
const phoneUtils = require('../utils/phoneUtils');
const sessionMapper = require('../utils/sessionMapper');


class WhatsAppService {
  constructor() {
    this.sockets = {};
    this.stores = {};
    /**
     * Mapa LID → telefone real por sessão.
     * Populado automaticamente pelos eventos contacts.set / contacts.upsert do Baileys.
     * Estrutura: { sessionId: { 'xxxx@lid': '5511999999999' } }
     */
    this.lidMaps = {};
    // Logger minimalista embutido para o Baileys não sujar o terminal
    this.baileysLogger = pino({ level: 'silent' });
  }

  async initializeSession(tenantId, sessionId) {
    if (this.sockets[sessionId]) return;

    // Associa a chave de sessão (possivelmente rotacionada) ao tenant original
    sessionMapper.associate(sessionId, `tenant_${tenantId}`);

    logger.info(`[*] Iniciando Baileys Nativo para tenant: ${tenantId} | session: ${sessionId}`);

    const tokenPath = path.join(__dirname, '..', '..', 'tokens', sessionId);
    if (!fs.existsSync(tokenPath)) {
      fs.mkdirSync(tokenPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(tokenPath);
    const { version } = await fetchLatestBaileysVersion();

    // Store customizado assíncrono para evitar Memory Leaks e Event Loop Block (Sprint Bridge)
    // Inicializa o mapa LID para esta sessão
    this.lidMaps[sessionId] = this.lidMaps[sessionId] || {};
    const lidMap = this.lidMaps[sessionId];

    /**
     * Popula o mapa LID → telefone a partir de um array de contatos do Baileys.
     * Cada contato pode ter { id: '55xxx@s.whatsapp.net', lid: 'yyy@lid' }.
     * @param {Array} contacts - Array de objetos de contato do Baileys
     */
    const populateLidMap = (contacts) => {
      if (!contacts) return;
      contacts.forEach(c => {
        if (c.id && c.id.includes('@s.whatsapp.net') && c.lid) {
          const phone = phoneUtils.normalizeToDb(c.id.split('@')[0]);
          lidMap[c.lid] = phone;
          logger.info(`[${sessionId}] 🗺️ LID mapeado: ${c.lid} → ${phone}`);
        }
      });
    };

    const store = {
      messages: {}, chats: {}, contacts: {},
      bind(ev) {
        ev.on('chats.set', ({ chats }) => chats.forEach(c => this.chats[c.id] = c));
        ev.on('chats.upsert', (chats) => chats.forEach(c => this.chats[c.id] = { ...this.chats[c.id], ...c }));
        ev.on('contacts.set', ({ contacts }) => {
          contacts.forEach(c => c.id && (this.contacts[c.id] = c));
          populateLidMap(contacts); // Popula mapa LID na sincronização inicial
        });
        ev.on('contacts.upsert', (contacts) => {
          contacts.forEach(c => c.id && (this.contacts[c.id] = { ...this.contacts[c.id], ...c }));
          populateLidMap(contacts); // Popula mapa LID em atualizações incrementais
        });

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
          if (contacts) populateLidMap(contacts); // Garante LID mapeado no histórico também
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

        // ── LOG DE DEBUG: CORPO COMPLETO DA MENSAGEM (Apenas Recebidas) ─────────────
        if (!isFromMe) {
          // logger.debug(`[${sessionId}] 📦 RAW RECEIVED MESSAGE: ${JSON.stringify(msg, null, 2)}`);
        }

        const remoteJid = msg.key.remoteJid;
        if (remoteJid === 'status@broadcast') continue; // Ignora status de WhatsApp

        const jidSuffix = remoteJid.split('@')[1] || '';
        let phone = remoteJid.split('@')[0];
        
        // Normaliza para o formato DB (13 dígitos) se não for LID
        if (jidSuffix !== 'lid') {
          phone = phoneUtils.normalizeToDb(phone);
        }

        const pushName = msg.pushName || 'Contato Desconhecido';

        // ── RESOLUÇÃO DE JID NO FORMATO LID ──────────────────────────────────────────
        // O WhatsApp usa Linked Device Identifiers (LID) que não são números de telefone.
        // Exemplo: '22285310236267670@lid' — deve ser resolvido para '5511998828726'.
        // Hierarquia de resolução:
        //   1. lidMap (mapa em memória populado na sincronização de contatos) — O(1)
        //   2. Scan de store.contacts procurando c.lid === remoteJid         — O(n)
        //   2. Redis: persistência entre sessões
        //   3. Scan de store.contacts procurando c.lid === remoteJid         — O(n)
        //   4. Descarte — evita salvar dados corrompidos no MongoDB
        // ── RESOLUÇÃO DE JID NO FORMATO LID / GRUPOS ────────────────────────────────
        // Prioridade 0: participantPn (Campo nativo do Baileys que traz o telefone real)
        const participantPn = msg.key.participantPn || (msg.message?.extendedTextMessage?.contextInfo?.participantPn);
        if (participantPn && participantPn.includes('@s.whatsapp.net')) {
          phone = phoneUtils.normalizeToDb(participantPn.split('@')[0]);
          
          // Alimenta o cache (Memória e Redis) para acelerar futuras mensagens
          const currentLidMap = this.lidMaps[sessionId] || {};
          currentLidMap[remoteJid] = phone;
          try {
            const redisService = require('../config/redis');
            await redisService.set(`lid_map:${tenantId}:${remoteJid}`, phone, 60 * 60 * 24 * 30);
          } catch (e) {}

          logger.info(`[${sessionId}] 💎 LID resolvido via participantPn: ${remoteJid} → ${phone}`);
        }
        else if (jidSuffix === 'lid') {
          const currentLidMap = this.lidMaps[sessionId] || {};

          // 1. Tenta Memória (Rápido)
          if (currentLidMap[remoteJid]) {
            phone = currentLidMap[remoteJid];
          } else {
            // 2. Tenta Redis (Persistente entre Restarts)
            try {
              const redisService = require('../config/redis');
              const cachedPhone = await redisService.get(`lid_map:${tenantId}:${remoteJid}`);
              if (cachedPhone) {
                phone = cachedPhone;
                currentLidMap[remoteJid] = phone;
                logger.info(`[${sessionId}] 🚀 LID resolvido via Redis: ${remoteJid} → ${phone}`);
              }
            } catch (redisErr) {
              logger.debug(`[${sessionId}] ⚠️ Redis indisponível para LID cache: ${redisErr.message}`);
            }

            if (!phone) {
              // 3. Tenta Store Scan (Sincronização atual)
              const contactsArr = Object.values(store.contacts || {});
              const matchByLid = contactsArr.find(
                c => c.lid === remoteJid && c.id && c.id.includes('@s.whatsapp.net')
              );

              if (matchByLid) {
                phone = phoneUtils.normalizeToDb(matchByLid.id.split('@')[0]);
                currentLidMap[remoteJid] = phone;
                
                // Persiste no Redis para a próxima vez
                try {
                  const redisService = require('../config/redis');
                  await redisService.set(`lid_map:${tenantId}:${remoteJid}`, phone, 60 * 60 * 24 * 30); // 30 dias
                } catch (e) {}

                logger.info(`[${sessionId}] 🔎 LID resolvido via Store Scan: ${remoteJid} → ${phone}`);
              }
            }
          }
        }

        // ── VERIFICAÇÃO DE DECRIPTOGRAFIA ───────────────────────────────────────────
        if (!msg.message || Object.keys(msg.message).length === 0) {
          logger.warn(`[${sessionId}] 🔐 Mensagem de '${pushName}' não pôde ser decriptografada (Erro de Sessão/MAC).`);
          continue;
        }

        // ── FILTRO DE CONTRATO E TIPO DE CHAT ───────────────────────────────────────
        if (remoteJid.endsWith('@g.us')) {
          continue; 
        }

        if (!phoneUtils.isValidDbFormat(phone)) {
          logger.warn(`[${sessionId}] 🛑 Contrato Violado: Mensagem de '${pushName}' [${remoteJid}] (phone='${phone}') descartada.`);
          continue;
        }

        // ── RECUPERAÇÃO DO CONTATO (Hierarquia: 1. Telefone, 2. Nome) ──────────────
        let dbContact = null;
        try {
          const { Op } = require('sequelize');
          // 1. Busca Primária: Por Número de Telefone
          dbContact = await Contact.findOne({ 
            where: { phone_number: phone, tenant_id: tenantId } 
          });

          // 2. Busca Secundária: Por Nome (se não achou pelo número)
          if (!dbContact && pushName && pushName !== 'Contato Desconhecido') {
            dbContact = await Contact.findOne({ 
              where: { 
                full_name: { [Op.iLike]: pushName }, 
                tenant_id: tenantId 
              } 
            });
            if (dbContact) {
              logger.info(`[${sessionId}] 👤 Contato reconciliado via Nome: ${pushName} (ID: ${dbContact.id})`);
            }
          }
        } catch (dbErr) {
          logger.error(`[${sessionId}] ❌ Erro ao recuperar contato do banco: ${dbErr.message}`);
        }

        // ── FILTRO DE MENSAGENS DE PROTOCOLO (Ignorar Sincronizações/Internos) ─────
        const msgType = Object.keys(msg.message || {})[0];
        const protocolTypes = ['protocolMessage', 'senderKeyDistributionMessage', 'peerDataOperationRequestResponseMessage', 'peerDataOperationRequestMessage'];
        
        if (protocolTypes.includes(msgType)) {
          continue;
        }

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
            method: 'new_message', // Padronizado para o front-end moderno
            params: {
              message_id: msg.key.id,
              conversation_id: phone,
              contact_phone: phone,
              contact_name: contactDisplayName,
              content: textContent,
              message_type: 'text',
              source: isFromMe ? 'agent' : 'user',
              from_me: isFromMe,
              side: isFromMe ? 'bot' : 'client',
              session: sessionId,
              tenant_id: tenantId,
              timestamp: new Date().toISOString()
            }
          };

          // ── NOTIFICAÇÃO EM TEMPO REAL COM LOGS DE DIAGNÓSTICO ─────────────────────
          try {
            // Dispara via publishEvent que já trata a normalização legado se necessário
            await connectionManager.publishEvent(tenantId, socketPayload);
            
            // Fallback para o método antigo caso o front ainda use 'receive_message'
            socketPayload.method = 'receive_message';
            await connectionManager.publishEvent(tenantId, socketPayload);

            const now = new Date().toLocaleString('pt-BR');
            logger.info(`✅ Mensagem entregue ao Front-end | Data: ${now} | Conteúdo: "${textContent.substring(0, 50)}..."`);
          } catch (wsErr) {
            logger.error(`❌ Falha na entrega WebSocket para o Front-end: ${wsErr.message}`);
          }

          // SE MENSAGEM DO USUÁRIO -> INSERE NA FILA DE FLOW (RabbitMQ)
          // [REMOVIDO A PEDIDO DO USUÁRIO] - Desativa a auto-resposta de fluxo.
          /*
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

    let jid = phoneUtils.normalizeToJid(to);

    // ── FIX CRÍTICO: Consulta o JID real no WhatsApp ──
    // O WhatsApp no Brasil possui inconsistências com o 9º dígito.
    // Consultamos o servidor para obter o JID exato (com ou sem o 9).
    try {
      const waExists = await sock.onWhatsApp(jid);
      if (waExists && waExists.length > 0 && waExists[0].exists) {
        jid = waExists[0].jid;
      } else {
        // Se não existir, tenta adicionar ou remover o 9º dígito
        const digits = String(to).replace(/\D/g, '');
        let alternateJid = jid;
        if (digits.length === 13 && digits.startsWith('55')) {
          // Remove o 9º dígito
          const areaCode = digits.substring(2, 4);
          alternateJid = `55${areaCode}${digits.substring(5)}@s.whatsapp.net`;
        } else if (digits.length === 12 && digits.startsWith('55')) {
          // Adiciona o 9º dígito
          const areaCode = digits.substring(2, 4);
          alternateJid = `55${areaCode}9${digits.substring(4)}@s.whatsapp.net`;
        }
        
        if (alternateJid !== jid) {
          const alternateExists = await sock.onWhatsApp(alternateJid);
          if (alternateExists && alternateExists.length > 0 && alternateExists[0].exists) {
            jid = alternateExists[0].jid;
          }
        }
      }
    } catch (err) {
      logger.warn(`[${sessionId}] ⚠️ Falha ao verificar existência no WhatsApp para ${jid}: ${err.message}`);
    }

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
