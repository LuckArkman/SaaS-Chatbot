const Message = require('../models/nosql/Message');
const rabbitmqBus = require('../config/rabbitmq');
const logger = require('../utils/logger');

const getChatHistory = async (req, res) => {
  const phone = req.params.conversation_id || req.params.phone;
  if (!phone) return res.status(400).json({ detail: 'Phone is required' });
  const cleanPhone = phone.split('@')[0]; // Previne vazamento do JID
  const { limit = 50, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const messages = await Message.find({ contact_phone: cleanPhone, tenant_id: req.tenantId })
                                  .sort({ timestamp: -1 })
                                  .skip(parseInt(skip))
                                  .limit(parseInt(limit));
    
    const total = await Message.countDocuments({ contact_phone: cleanPhone, tenant_id: req.tenantId });

    const serializedData = messages.reverse().map(doc => {
      const isFromMe = ['agent', 'bot', 'human', 'system'].includes(doc.source);
      return {
        id: doc._id.toString(),
        conversation_id: phone,
        is_read: doc.ack === 3,
        agent_id: null,
        status: ['PENDING', 'SENT', 'DELIVERED', 'READ'][doc.ack] || 'SENT',
        content: doc.content,
        side: isFromMe ? 'bot' : 'client',
        from_me: isFromMe,
        type: doc.message_type || 'text',
        external_id: doc.external_id,
        created_at: doc.timestamp,
        contact: {
          id: doc.contact_phone,
          full_name: doc.contact_name || doc.contact_phone,
          phone_number: doc.contact_phone
        }
      };
    });

    return res.json({
      total,
      has_more: total > skip + parseInt(limit),
      data: serializedData
    });
  } catch (e) {
    logger.error(`[Chat] Erro ao buscar histórico: ${e.message}`);
    return res.status(500).json({ detail: 'Database error' });
  }
};

const sendManualMessage = async (req, res) => {
  let { to, conversation_id, content, type = 'text' } = req.body;
  to = to || conversation_id;

  if (!to || !content) {
    return res.status(400).json({ error: 'Destinatário e conteúdo são obrigatórios.' });
  }
  
  const cleanTo = String(to).split('@')[0];

  try {
    // 1. Grava no banco otimista (Aparece instantâneo no Front)
    const pendingMessage = await Message.create({
      tenant_id: req.tenantId,
      session_name: `tenant_${req.tenantId}`, // Padrão
      contact_phone: cleanTo,
      content: content,
      source: 'agent', // Human agent
      message_type: type,
      ack: 0 // Pending
    });

    // 2. Dispara pra fila de Outgoing (Mesma arquitetura testada e resiliente do Python)
    await rabbitmqBus.publish('messages_exchange', 'message.outgoing', {
      tenant_id: req.tenantId,
      to: cleanTo,
      content,
      type
    });

    return res.status(202).json({ success: true, message_id: pendingMessage._id });
  } catch (e) {
    logger.error(`[Chat] Erro ao enfileirar mensagem: ${e.message}`);
    return res.status(500).json({ detail: 'Failed to send message' });
  }
};

const { WhatsAppInstance } = require('../models/sql/models');
const whatsappCore = require('../services/whatsappCore');

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
  const cleanPhone = phone.split('@')[0];
  const limit = parseInt(req.query.limit || 50);
  
  try {
    const messages = await Message.find({ contact_phone: cleanPhone, tenant_id: req.tenantId })
                                  .sort({ timestamp: -1 })
                                  .limit(limit);
    
    // Serialização rigorosa para o formato esperado pelo Front-end legado
    const serializedMessages = messages.reverse().map(doc => {
      const isFromMe = ['agent', 'bot', 'human', 'system'].includes(doc.source);
      return {
        message_id: doc.external_id || doc._id.toString(),
        from_me: isFromMe,
        side: isFromMe ? 'bot' : 'client',
        sender: isFromMe ? doc.session_name : doc.contact_phone,
        content: doc.content,
        type: doc.message_type || 'text',
        timestamp: new Date(doc.timestamp).getTime() / 1000,
        status: doc.ack || 0
      };
    });

    return res.json({
      jid: `${cleanPhone}@s.whatsapp.net`,
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
