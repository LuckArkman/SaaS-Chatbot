const Message = require('../models/nosql/Message');
const rabbitmqBus = require('../config/rabbitmq');
const phoneUtils = require('../utils/phoneUtils');
const logger = require('../utils/logger');
const whatsappCore = require('../services/whatsappCore');

const parseBaileysMessage = (msg, cleanPhone, isLegacyFormat = false) => {
  let messageBody = msg.message || {};
  if (messageBody.viewOnceMessage?.message) messageBody = messageBody.viewOnceMessage.message;
  else if (messageBody.viewOnceMessageV2?.message) messageBody = messageBody.viewOnceMessageV2.message;
  else if (messageBody.ephemeralMessage?.message) messageBody = messageBody.ephemeralMessage.message;

  const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
  const activeMediaType = Object.keys(messageBody).find(type => mediaTypes.includes(type));
  
  let messageType = 'text';
  let textContent = '';
  if (activeMediaType) {
    const mediaObj = messageBody[activeMediaType];
    messageType = activeMediaType.replace('Message', '');
    textContent = mediaObj.caption || mediaObj.fileName || (messageType === 'sticker' ? 'Adesivo (Sticker)' : `[Mídia: ${messageType}]`);
  } else {
    if (messageBody.conversation) textContent = messageBody.conversation;
    else if (messageBody.extendedTextMessage) textContent = messageBody.extendedTextMessage.text;
    else textContent = '📦 [Mídia/Outro]';
  }

  const isFromMe = msg.key.fromMe;
  const statusNumber = msg.status || 0;
  // Status: 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED
  const statusStr = ['PENDING', 'SENT', 'SENT', 'DELIVERED', 'READ', 'PLAYED'][statusNumber] || 'SENT';
  const timestamp = msg.messageTimestamp ? (msg.messageTimestamp.low || msg.messageTimestamp) * 1000 : Date.now();

  if (isLegacyFormat) {
    return {
      message_id: msg.key.id,
      from_me: isFromMe,
      side: isFromMe ? 'bot' : 'client',
      sender: isFromMe ? 'agent' : cleanPhone,
      content: textContent,
      media_url: null,
      type: messageType,
      timestamp: timestamp / 1000,
      status: statusNumber
    };
  }

  return {
    id: msg.key.id,
    conversation_id: cleanPhone,
    is_read: statusNumber >= 4,
    agent_id: null,
    status: statusStr,
    content: textContent,
    media_url: null,
    side: isFromMe ? 'bot' : 'client',
    from_me: isFromMe,
    type: messageType,
    external_id: msg.key.id,
    created_at: new Date(timestamp).toISOString(),
    contact: {
      id: cleanPhone,
      full_name: cleanPhone,
      phone_number: cleanPhone
    }
  };
};

const getChatHistory = async (req, res) => {
  const phone = req.params.conversation_id || req.params.phone;
  if (!phone) return res.status(400).json({ detail: 'Phone is required' });
  const isGroup = phone.includes('@g.us');
  const cleanPhone = isGroup ? phone : phone.split('@')[0];
  const { limit = 50, page = 1, sync } = req.query;
  const skip = (page - 1) * limit;

  try {
    const phonesToQuery = [cleanPhone];
    const digits = String(cleanPhone).replace(/\D/g, '');
    if (digits.length === 13 && digits.startsWith('55')) {
      const areaCode = digits.substring(2, 4);
      phonesToQuery.push(`55${areaCode}${digits.substring(5)}`);
    } else if (digits.length === 12 && digits.startsWith('55')) {
      const areaCode = digits.substring(2, 4);
      phonesToQuery.push(`55${areaCode}9${digits.substring(4)}`);
    }

    // ── ETAPA 1: Verifica MongoDB Primeiro ──────────────────
    let messages = await Message.find({ contact_phone: { $in: phonesToQuery }, tenant_id: req.tenantId })
                                  .sort({ timestamp: -1 })
                                  .skip(parseInt(skip))
                                  .limit(parseInt(limit));
    
    let total = await Message.countDocuments({ contact_phone: { $in: phonesToQuery }, tenant_id: req.tenantId });

    // ── ETAPA 2: Fallback para Baileys se MongoDB estiver vazio ou sync forçando ──
    if (total === 0 || sync === 'true') {
      const sessionId = whatsappCore.getActiveSessionForTenant(req.tenantId);
      if (sessionId) {
        logger.info(`[Chat] 📡 Solicitando histórico on-demand ao WhatsApp para JID: ${cleanPhone} | count: ${limit}`);
        try {
          await whatsappCore.requestHistoryFromWhatsApp(sessionId, cleanPhone, parseInt(limit), 8000);
        } catch (e) {
          logger.warn(`[Chat] Falha na solicitação on-demand ao WhatsApp: ${e.message}`);
        }
        
        // Após os 8s (onde o Baileys emite upserts que gravam no Mongo), buscamos novamente no MongoDB
        messages = await Message.find({ contact_phone: { $in: phonesToQuery }, tenant_id: req.tenantId })
                                .sort({ timestamp: -1 })
                                .skip(parseInt(skip))
                                .limit(parseInt(limit));
        total = await Message.countDocuments({ contact_phone: { $in: phonesToQuery }, tenant_id: req.tenantId });
      }
    }

    // ── ETAPA 3: Formata Retorno ──────────────────
    const serializedData = messages.reverse().map(doc => {
      const isFromMe = ['agent', 'bot', 'human', 'system'].includes(doc.source);
      return {
        id: doc._id.toString(),
        conversation_id: phone,
        is_read: doc.ack === 3,
        agent_id: null,
        status: ['PENDING', 'SENT', 'DELIVERED', 'READ'][doc.ack] || 'SENT',
        content: doc.content,
        media_url: doc.media_url || null,
        side: isFromMe ? 'bot' : 'client',
        timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : new Date().toISOString(),
        from_me: isFromMe,
        type: doc.message_type || 'text'
      };
    });

    return res.json({
      total,
      has_more: total > skip + messages.length,
      data: serializedData
    });
  } catch (e) {
    logger.error(`[Chat] Erro ao buscar histórico: ${e.message}`);
    return res.status(500).json({ detail: 'Erro interno ao buscar histórico' });
  }
};

const sendManualMessage = async (req, res) => {
  let { to, conversation_id, content, type, media_url } = req.body;
  to = to || conversation_id;

  // Deve existir pelo menos um destinatário e (texto ou mídia)
  if (!to || (!content && !media_url)) {
    return res.status(400).json({ error: 'Destinatário e conteúdo (texto ou mídia) são obrigatórios.' });
  }

  const cleanTo = phoneUtils.normalizeToDb(to);

  // Auto-detecta o tipo de mensagem quando não especificado
  if (!type || type === 'text') {
    if (media_url) {
      const ext = media_url.split('.').pop().toLowerCase().split('?')[0];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
      const audioExts = ['ogg', 'mp3', 'aac', 'wav', 'm4a', 'opus'];
      const docExts   = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'txt', 'csv'];

      if (imageExts.includes(ext))      type = 'image';
      else if (videoExts.includes(ext)) type = 'video';
      else if (audioExts.includes(ext)) type = 'audio';
      else if (docExts.includes(ext))   type = 'document';
      else                              type = 'document'; // fallback seguro
    } else {
      type = 'text';
    }
  }

  const textContent = content || '';  // legenda para mídias; pode ser vazio

  try {
    // 1. Grava no banco optimista (aparece instantaneamente no Front)
    const pendingMessage = await Message.create({
      tenant_id: req.tenantId,
      session_name: `tenant_${req.tenantId}`,
      contact_phone: cleanTo,
      content: textContent || media_url,  // fallback para URL caso sem legenda
      media_url: media_url || null,
      source: 'agent',
      message_type: type,
      ack: 0
    });

    // 2. Publica na fila RabbitMQ com todos os campos necessários
    await rabbitmqBus.publish('messages_exchange', 'message.outgoing', {
      tenant_id: req.tenantId,
      to: cleanTo,
      content: textContent,
      type,
      media_url: media_url || null
    });

    return res.status(202).json({ success: true, message_id: pendingMessage._id });
  } catch (e) {
    logger.error(`[Chat] Erro ao enfileirar mensagem: ${e.message}`);
    return res.status(500).json({ detail: 'Failed to send message' });
  }
};


const { WhatsAppInstance } = require('../models/sql/models');

const getActiveSessionName = async (tenantId) => {
  const instance = await WhatsAppInstance.findOne({ where: { tenant_id: tenantId } });
  if (!instance || instance.status !== 'CONNECTED') {
    throw new Error('Agente não está conectado ao WhatsApp. Conecte o bot primeiro.');
  }
  return instance.session_name;
};

const listConversations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 50);

    // Agregação no MongoDB para pegar o último diálogo de cada contato do Tenant
    const conversations = await Message.aggregate([
      { $match: { tenant_id: req.tenantId } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$contact_phone",
          contact_phone: { $first: "$contact_phone" },
          contact_name: { $first: "$contact_name" },
          last_message: { $first: "$content" },
          timestamp: { $first: "$timestamp" },
          unread_count: {
            $sum: { $cond: [{ $eq: ["$ack", 0] }, 1, 0] } // Exemplo simples
          }
        }
      },
      { $sort: { timestamp: -1 } },
      { $limit: limit }
    ]);

    // Formata pro formato que o Front-end espera
    const formattedConversations = conversations.map(c => ({
      id: c.contact_phone,
      contact_name: c.contact_name || 'Desconhecido',
      contact_phone: c.contact_phone,
      last_message: c.last_message,
      timestamp: c.timestamp,
      unread_count: c.unread_count
    }));

    return res.json({
      total: formattedConversations.length,
      conversations: formattedConversations
    });
  } catch (e) {
    logger.error(`[Chat] Erro ao listar conversas via DB: ${e.message}`);
    return res.status(503).json({ detail: e.message });
  }
};

const getConversation = async (req, res) => {
  const phone = req.params.conversation_id || req.params.phone;
  if (!phone) return res.status(400).json({ detail: 'Phone is required' });
  const isGroup = phone.includes('@g.us');
  const cleanPhone = isGroup ? phone : phone.split('@')[0];
  const returnedJid = isGroup ? phone : `${cleanPhone}@s.whatsapp.net`;
  const limit = parseInt(req.query.limit || 50);
  
  try {
    let baileysHistory = [];
    try {
      const sessionId = whatsappCore.getActiveSessionForTenant(req.tenantId);
      if (sessionId) {
        baileysHistory = await whatsappCore.getChatHistory(sessionId, cleanPhone, limit);
      }
    } catch (e) {
      logger.warn(`[Chat] Baileys history fetch error: ${e.message}`);
    }

    if (baileysHistory && baileysHistory.length > 0) {
      const serializedMessages = baileysHistory.map(msg => parseBaileysMessage(msg, cleanPhone, true));
      return res.json({
        jid: returnedJid,
        phone: cleanPhone,
        total_messages: serializedMessages.length,
        has_more: false,
        messages: serializedMessages
      });
    }

    // Fallback: MongoDB
    const messages = await Message.find({ contact_phone: cleanPhone, tenant_id: req.tenantId })
                                  .sort({ timestamp: -1 })
                                  .limit(limit);
    
    const serializedMessages = messages.reverse().map(doc => {
      const isFromMe = ['agent', 'bot', 'human', 'system'].includes(doc.source);
      return {
        message_id: doc.external_id || doc._id.toString(),
        from_me: isFromMe,
        side: isFromMe ? 'bot' : 'client',
        sender: isFromMe ? doc.session_name : doc.contact_phone,
        content: doc.content,
        media_url: doc.media_url || null,
        type: doc.message_type || 'text',
        timestamp: new Date(doc.timestamp).getTime() / 1000,
        status: doc.ack || 0
      };
    });

    return res.json({
      jid: returnedJid,
      phone: cleanPhone,
      total_messages: serializedMessages.length,
      has_more: false,
      messages: serializedMessages
    });
  } catch (e) {
    logger.error(`[Chat] Erro ao recuperar histórico específico do DB: ${e.message}`);
    return res.status(503).json({ detail: e.message });
  }
};

module.exports = { getChatHistory, sendManualMessage, listConversations, getConversation };
