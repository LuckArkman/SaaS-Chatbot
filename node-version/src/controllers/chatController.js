const Message = require('../models/nosql/Message');
const rabbitmqBus = require('../config/rabbitmq');
const logger = require('../utils/logger');

const getChatHistory = async (req, res) => {
  const { phone } = req.params;
  const { limit = 50, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const messages = await Message.find({ contact_phone: phone })
                                  .sort({ timestamp: -1 })
                                  .skip(parseInt(skip))
                                  .limit(parseInt(limit));
    
    const total = await Message.countDocuments({ contact_phone: phone });

    return res.json({
      total,
      has_more: total > skip + parseInt(limit),
      data: messages.reverse() // Retorna na ordem cronológica de exibição UI
    });
  } catch (e) {
    logger.error(`[Chat] Erro ao buscar histórico: ${e.message}`);
    return res.status(500).json({ detail: 'Database error' });
  }
};

const sendManualMessage = async (req, res) => {
  const { to, content, type = 'text' } = req.body;

  if (!to || !content) {
    return res.status(400).json({ detail: 'Destinatário e conteúdo são obrigatórios.' });
  }

  try {
    // 1. Grava no banco otimista (Aparece instantâneo no Front)
    const pendingMessage = await Message.create({
      tenant_id: req.tenantId,
      session_name: `tenant_${req.tenantId}`, // Padrão
      contact_phone: to,
      content: content,
      source: 'agent', // Human agent
      message_type: type,
      ack: 0 // Pending
    });

    // 2. Dispara pra fila de Outgoing (Mesma arquitetura testada e resiliente do Python)
    await rabbitmqBus.publish('messages_exchange', 'message.outgoing', {
      tenant_id: req.tenantId,
      to,
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
    const sessionName = await getActiveSessionName(req.tenantId);
    let chats = await whatsappCore.listChats(sessionName);
    
    // Filtra apenas contatos diretos e remove broadcasts/newsletters
    chats = chats.filter(chat => {
      const id = chat.id || '';
      return id.endsWith('@s.whatsapp.net') || id.endsWith('@c.us') || !id.includes('@');
    });

    // Ordena do mais recente para o mais antigo
    chats.sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0));

    return res.json({
      total: chats.length,
      session_id: sessionName,
      conversations: chats.slice(0, parseInt(req.query.limit || 50))
    });
  } catch (e) {
    logger.error(`[Chat] Erro ao listar conversas: ${e.message}`);
    return res.status(503).json({ detail: e.message });
  }
};

const getConversation = async (req, res) => {
  const { phone } = req.params;
  const limit = parseInt(req.query.limit || 50);
  
  try {
    const sessionName = await getActiveSessionName(req.tenantId);
    
    // Faz o backfill das mensagens em memória do WhatsApp
    const nativeMessages = await whatsappCore.getChatHistory(sessionName, phone, limit);
    
    // No ambiente real, faríamos o sync disso com o Mongo (Message.findOrCreate...)
    // Aqui retornaremos direto da memória por performance para a requisição, e depois a persistência
    // seria contínua via Worker (já implementado no upsert do Baileys)
    
    return res.json({
      jid: phone.includes('@') ? phone : `${phone}@s.whatsapp.net`,
      phone: phone.split('@')[0],
      total_messages: nativeMessages.length,
      has_more: false,
      messages: nativeMessages
    });
  } catch (e) {
    logger.error(`[Chat] Erro ao recuperar histórico específico: ${e.message}`);
    return res.status(503).json({ detail: e.message });
  }
};

module.exports = { getChatHistory, sendManualMessage, listConversations, getConversation };
