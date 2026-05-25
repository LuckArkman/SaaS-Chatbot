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
          
          await connectionManager.publishEvent(tenantId, {
            type: 'bot_qrcode_update',
            qrcode: qrBase64,
            session: sessionId
          });
        } catch (e) {
          logger.error(`[${sessionId}] Erro ao converter QR para base64: ${e.message}`);
        }
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
          
          await connectionManager.publishEvent(tenantId, {
            type: 'bot_status_update',
            status: 'CONNECTING',
            session: sessionId
          });
          
          delete this.sockets[sessionId];
          setTimeout(() => this.initializeSession(tenantId, sessionId), 5000);
        } else {
          logger.error(`[${sessionId}] Sessão permanentemente deslogada.`);
          await WhatsAppInstance.update(
            { status: 'DISCONNECTED', qrcode_base64: null },
            { where: { session_name: sessionId }, ignoreTenant: true }
          );
          
          await connectionManager.publishEvent(tenantId, {
            type: 'bot_status_update',
            status: 'DISCONNECTED',
            session: sessionId
          });
          
          delete this.sockets[sessionId];
          fs.rmSync(tokenPath, { recursive: true, force: true });
        }
      } else if (connection === 'open') {
        logger.info(`[${sessionId}] ✅ WhatsApp Conectado e Sincronizado!`);
        await WhatsAppInstance.update(
          { status: 'CONNECTED', qrcode_base64: null },
          { where: { session_name: sessionId }, ignoreTenant: true }
        );
        
        await connectionManager.publishEvent(tenantId, {
          type: 'bot_status_update',
          status: 'CONNECTED',
          session: sessionId
        });
      }
    });

    // Eventos de Chamadas (Sinalização via Baileys)
    sock.ev.on('call', async (calls) => {
      for (const call of calls) {
        if (call.status === 'offer') {
          const fromJid = call.from;
          const contactPhone = phoneUtils.normalizeToDb(fromJid.split('@')[0]);
          const callId = call.id;
          const isVideo = call.isVideo;

          logger.info(`[${sessionId}] 📞 Chamada recebida de ${contactPhone} | ID: ${callId} | Vídeo: ${isVideo}`);

          try {
            const { CallLog } = require('../models/sql/models');
            await CallLog.create({
              tenant_id: tenantId.toUpperCase(),
              contact_phone: contactPhone,
              call_id: callId,
              type: isVideo ? 'video' : 'voice',
              direction: 'incoming',
              status: 'ringing'
            });

            await connectionManager.publishEvent(tenantId, {
              method: 'call_incoming',
              params: {
                call_id: callId,
                contact_phone: contactPhone,
                is_video: isVideo,
                status: 'ringing',
                timestamp: new Date().toISOString()
              }
            });
          } catch (err) {
            logger.error(`[${sessionId}] Erro ao registrar chamada recebida: ${err.message}`);
          }
        } 
        else if (['timeout', 'reject', 'terminate'].includes(call.status)) {
          const callId = call.id;
          logger.info(`[${sessionId}] 📞 Chamada finalizada/rejeitada no celular. Status: ${call.status} | ID: ${callId}`);
          
          try {
            const { CallLog } = require('../models/sql/models');
            const log = await CallLog.findOne({ where: { call_id: callId, tenant_id: tenantId.toUpperCase() } });
            if (log) {
              let finalStatus = 'ended';
              if (call.status === 'timeout') finalStatus = 'missed';
              else if (call.status === 'reject') finalStatus = 'rejected';
              
              log.status = finalStatus;
              
              if (log.status === 'accepted' || log.status === 'ringing') {
                // Se estava ativa ou tocando, calcula duração desde a última atualização
                const dur = Math.round((new Date() - new Date(log.updated_at || log.created_at)) / 1000);
                log.duration = dur > 0 ? dur : 0;
              }
              await log.save();
            }

            await connectionManager.publishEvent(tenantId, {
              method: 'call_ended',
              params: {
                call_id: callId,
                status: call.status === 'timeout' ? 'missed' : 'ended',
                timestamp: new Date().toISOString()
              }
            });
          } catch (err) {
            logger.error(`[${sessionId}] Erro ao atualizar finalização de chamada: ${err.message}`);
          }
        }
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
        // Hierarquia de resolução implementada:
        //   0. participantPn / senderPn (Campo oficial Baileys com telefone real)
        //   1. lidMap (Mapa em memória da sessão atual)
        //   2. Redis (Persistência global entre sessões e restarts)
        //   3. Store Scan (Busca nos contatos sincronizados pelo Baileys)
        // ── RESOLUÇÃO DE JID NO FORMATO LID / GRUPOS ────────────────────────────────
        // Prioridade 0: participantPn / senderPn (Campos nativos do Baileys que trazem o telefone real)
        const realPhoneJid = msg.key.participantPn || msg.key.senderPn || 
                           (msg.message?.extendedTextMessage?.contextInfo?.participantPn) ||
                           (msg.message?.extendedTextMessage?.contextInfo?.senderPn);

        if (realPhoneJid && realPhoneJid.includes('@s.whatsapp.net')) {
          phone = phoneUtils.normalizeToDb(realPhoneJid.split('@')[0]);
          
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

        // Unpack wrappers (viewOnce, ephemeral, etc.)
        let messageBody = msg.message;
        if (messageBody.viewOnceMessage?.message) {
          messageBody = messageBody.viewOnceMessage.message;
        } else if (messageBody.viewOnceMessageV2?.message) {
          messageBody = messageBody.viewOnceMessageV2.message;
        } else if (messageBody.ephemeralMessage?.message) {
          messageBody = messageBody.ephemeralMessage.message;
        }

        // ── FILTRO DE MENSAGENS DE PROTOCOLO (Ignorar Sincronizações/Internos) ─────
        const msgType = Object.keys(messageBody || {})[0];
        const protocolTypes = ['protocolMessage', 'senderKeyDistributionMessage', 'peerDataOperationRequestResponseMessage', 'peerDataOperationRequestMessage'];
        
        if (protocolTypes.includes(msgType)) {
          continue;
        }

        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        const activeMediaType = Object.keys(messageBody || {}).find(type => mediaTypes.includes(type));
        
        let mediaUrl = null;
        let messageType = 'text';
        let textContent = '';
        
        if (activeMediaType) {
          const mediaObj = messageBody[activeMediaType];
          messageType = activeMediaType.replace('Message', ''); // image, video, audio, document
          textContent = mediaObj.caption || mediaObj.fileName || `[Mídia: ${messageType}]`;
          
          try {
            logger.info(`[${sessionId}] 📂 Baixando anexo de mídia do tipo: ${messageType}...`);
            
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(
              msg,
              'buffer',
              {},
              { logger: this.baileysLogger, rekey: false }
            );

            if (buffer) {
              const originalFileName = mediaObj.fileName || 
                                       (messageType === 'image' ? 'photo.jpg' : 
                                        messageType === 'video' ? 'video.mp4' : 
                                        messageType === 'audio' ? 'audio.mp3' : 'file.bin');
              
              const StorageService = require('./storageService');
              const localPath = await StorageService.saveUpload(buffer, originalFileName, tenantId.toUpperCase());
              mediaUrl = StorageService.getPublicUrl(localPath);
              logger.info(`[${sessionId}] 📂 Mídia salva com sucesso: ${mediaUrl}`);
            }
          } catch (downloadErr) {
            logger.error(`[${sessionId}] ❌ Falha ao baixar/salvar mídia: ${downloadErr.message}`);
          }
        } else {
          if (messageBody.conversation) textContent = messageBody.conversation;
          else if (messageBody.extendedTextMessage) textContent = messageBody.extendedTextMessage.text;
          else textContent = '📦 [Mídia/Outro]';
        }

        logger.info(`[${sessionId}] 📩 Mensagem Recebida de ${phone}: ${textContent.substring(0, 30)}`);

        // GRAVAÇÃO NO MONGOOSE COM PROTEÇÃO CONTRA DUPLICATAS OTIMISTAS E DE BANCO
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
              existingMsg.message_type = messageType;
              existingMsg.media_url = mediaUrl;
              await existingMsg.save();
            } else {
              // Enviado direto do celular do usuário (verifica se já existe para evitar duplicação)
              const isDuplicate = await Message.findOne({
                tenant_id: tenantId,
                external_id: msg.key.id
              });

              if (!isDuplicate) {
                await Message.create({
                  tenant_id: tenantId,
                  session_name: sessionId,
                  contact_phone: phone,
                  contact_name: pushName,
                  content: textContent,
                  source: 'agent',
                  message_type: messageType,
                  media_url: mediaUrl,
                  external_id: msg.key.id,
                  ack: 1
                });
              } else {
                logger.debug(`[${sessionId}] 🛡️ Mensagem de saída ${msg.key.id} já existe no MongoDB. Pulando criação.`);
              }
            }
          } else {
            // Mensagem incoming de um usuário (verifica se já existe para evitar duplicação)
            const isDuplicate = await Message.findOne({
              tenant_id: tenantId,
              external_id: msg.key.id
            });

            if (!isDuplicate) {
              await Message.create({
                tenant_id: tenantId,
                session_name: sessionId,
                contact_phone: phone,
                contact_name: pushName,
                content: textContent,
                source: 'user',
                message_type: messageType,
                media_url: mediaUrl,
                external_id: msg.key.id
              });
            } else {
              logger.debug(`[${sessionId}] 🛡️ Mensagem de entrada ${msg.key.id} já existe no MongoDB. Pulando criação.`);
            }
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
              message_type: messageType,
              media_url: mediaUrl,
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
            // Dispara via publishEvent (Método Moderno: new_message)
            await connectionManager.publishEvent(tenantId, socketPayload);

            const now = new Date().toLocaleString('pt-BR');
            logger.info(`✅ Mensagem entregue ao Front-end | Data: ${now} | Conteúdo: "${textContent.substring(0, 50)}..."`);
          } catch (wsErr) {
            logger.error(`❌ Falha na entrega WebSocket para o Front-end: ${wsErr.message}`);
          }

          // ── PROCESSAMENTO DE INTELIGÊNCIA ARTIFICIAL (BRAIN/RAG) ──────────────
          if (!isFromMe) {
            // Executa em segundo plano para não bloquear o socket
            this.handleAiResponse(tenantId, sessionId, phone, textContent);
          }

        } catch (dbErr) {
          logger.error(`[${sessionId}] ❌ Erro ao processar mensagem localmente: ${dbErr.message}`);
        }
      }
    });
  }

  /**
   * Processa a resposta automática via IA com suporte a RAG
   */
  async handleAiResponse(tenantId, sessionId, phone, userMessage) {
    try {
      const agentService = require('./ai/agentService');
      
      // A "Instância MCP" do tenant processa a mensagem de forma isolada
      const responseText = await agentService.processMessage(tenantId, userMessage);

      // Envio da Resposta se gerada
      if (responseText) {
        await this.sendMessage(sessionId, phone, responseText);
        logger.info(`🤖 [MCP:${tenantId}] Resposta enviada para ${phone}`);
      }

    } catch (e) {
      logger.error(`❌ Falha no Cérebro AI do Tenant ${tenantId}: ${e.message}`);
    }
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
   * Helper para resolver mimetype com base na extensão para o envio de documentos
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Envio de mensagens invocado pelos Workers ou API diretamente em memória.
   * Suporta mídias (image, video, audio, document) além de texto puro.
   */
  async sendMessage(sessionId, to, content, type = 'text', mediaUrl = null) {
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

    let result;
    if (type !== 'text' && mediaUrl) {
      // Resolve caminho físico local do arquivo a partir da URL pública
      const relativePath = mediaUrl.replace(/^\//, ''); // Remove barra inicial
      const localPath = path.join(__dirname, '..', '..', relativePath.split('/').join(path.sep));

      if (!fs.existsSync(localPath)) {
        throw new Error(`Arquivo de mídia não encontrado no disco local: ${localPath}`);
      }

      logger.info(`[${sessionId}] 📤 Enviando mídia (${type}) para ${jid} | Path: ${localPath}`);

      if (type === 'image') {
        result = await sock.sendMessage(jid, { image: { url: localPath }, caption: content });
      } else if (type === 'video') {
        result = await sock.sendMessage(jid, { video: { url: localPath }, caption: content });
      } else if (type === 'audio') {
        result = await sock.sendMessage(jid, { audio: { url: localPath }, mimetype: 'audio/mp4', ptt: true });
      } else if (type === 'document') {
        const originalName = path.basename(localPath).replace(/^[a-f0-9-]{36}_/, '');
        const mimeType = this.getMimeType(localPath);
        result = await sock.sendMessage(jid, { document: { url: localPath }, mimetype: mimeType, fileName: originalName });
      } else {
        throw new Error(`Tipo de mídia não suportado para envio: ${type}`);
      }
    } else {
      logger.info(`[${sessionId}] 📤 Enviando nativamente para ${jid}`);
      result = await sock.sendMessage(jid, { text: content });
    }

    return { success: !!result, message_id: result?.key?.id };
  }

  /**
   * Dispara um sinal de chamada de voz ou vídeo (signaling offer)
   */
  async makeCall(sessionId, phone, isVideo = false) {
    const sock = this.sockets[sessionId];
    if (!sock) throw new Error(`Sessão ${sessionId} não está ativa.`);
    if (!sock.user) throw new Error(`Sessão ${sessionId} não está autenticada.`);

    const jid = phoneUtils.normalizeToJid(phone);
    const callId = require('crypto').randomBytes(16).toString('hex');
    
    logger.info(`[${sessionId}] 📞 Emitindo oferta de chamada para ${jid} | ID: ${callId} | Vídeo: ${isVideo}`);
    
    if (typeof sock.offerCall === 'function') {
      const result = await sock.offerCall(jid, { callId, isVideo });
      return { id: callId, result };
    } else {
      logger.warn(`[${sessionId}] ⚠️ sock.offerCall não é suportado pelo Baileys instalado. Simulando sinal.`);
      return { id: callId, simulated: true };
    }
  }

  /**
   * Rejeita chamada entrante
   */
  async rejectCall(sessionId, callId, callerJid) {
    const sock = this.sockets[sessionId];
    if (!sock) throw new Error(`Sessão ${sessionId} não está ativa.`);
    
    const cleanJid = callerJid.includes('@') ? callerJid : phoneUtils.normalizeToJid(callerJid);
    logger.info(`[${sessionId}] 📞 Rejeitando chamada ID ${callId} de ${cleanJid}`);
    
    if (typeof sock.rejectCall === 'function') {
      await sock.rejectCall(callId, cleanJid);
      return true;
    }
    return false;
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
