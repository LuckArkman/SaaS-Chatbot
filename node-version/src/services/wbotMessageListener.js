const logger = require('../utils/logger');
const { Contact } = require('../models/sql/models');
const Message = require('../models/nosql/Message');
const agentService = require('./ai/agentService');
const connectionManager = require('../websockets/connectionManager');
const phoneUtils = require('../utils/phoneUtils');
const whatsappService = require('./whatsappCore');

const extractText = (msg) => {
  if (!msg.message) return '';
  const type = Object.keys(msg.message)[0];
  if (type === 'conversation') return msg.message.conversation;
  if (type === 'extendedTextMessage') return msg.message.extendedTextMessage.text;
  if (type === 'imageMessage') return msg.message.imageMessage.caption || '[Mídia]';
  if (type === 'videoMessage') return msg.message.videoMessage.caption || '[Vídeo]';
  if (type === 'documentMessage') return msg.message.documentMessage.caption || '[Documento]';
  if (type === 'audioMessage') return '[Áudio]';
  if (type === 'buttonsResponseMessage') return msg.message.buttonsResponseMessage.selectedDisplayText;
  if (type === 'listResponseMessage') return msg.message.listResponseMessage.title;
  if (type === 'templateButtonReplyMessage') return msg.message.templateButtonReplyMessage.selectedDisplayText;
  return '[Mensagem não suportada/Mídia]';
};

const handleMessage = async (wsocket, tenantId, sessionName, msg) => {
  if (!msg.message || msg.key.fromMe) return;

  const remoteJid = msg.key.remoteJid;
  if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') return; // Ignora grupos e status

  const phone = phoneUtils.normalizeToDb(remoteJid.split('@')[0]);
  const pushName = msg.pushName || 'Contato Desconhecido';
  const textContent = extractText(msg);
  const msgId = msg.key.id;
  const timestamp = new Date((msg.messageTimestamp || Date.now() / 1000) * 1000);

  // 1. Salvar / Recuperar Contato
  let dbContact = null;
  try {
    dbContact = await Contact.findOne({ where: { phone_number: phone, tenant_id: tenantId } });
    if (!dbContact) {
      dbContact = await Contact.create({
        phone_number: phone,
        full_name: pushName !== 'Contato Desconhecido' ? pushName : `WhatsApp ${phone.slice(-4)}`,
        tenant_id: tenantId,
        is_group: false
      });
    }
  } catch (e) {
    logger.error(`[Tenant:${tenantId}] Erro ao salvar contato: ${e.message}`);
  }

  // 2. Salvar Mensagem no DB
  try {
    const isDuplicate = await Message.findOne({ tenant_id: tenantId, external_id: msgId });
    if (!isDuplicate) {
      await Message.create({
        tenant_id: tenantId,
        session_name: sessionName,
        contact_phone: phone,
        contact_name: pushName,
        content: textContent,
        source: 'user',
        message_type: Object.keys(msg.message)[0] || 'text',
        external_id: msgId,
        ack: 1, // Received
        timestamp: timestamp
      });
    }
  } catch (e) {
    logger.error(`[Tenant:${tenantId}] Erro ao salvar mensagem no MongoDB: ${e.message}`);
  }

  // 3. Emitir via WebSocket para o Front
  const contactDisplayName = dbContact ? dbContact.full_name : pushName;
  const socketPayload = {
    method: 'receive_message',
    params: {
      message_id: msgId,
      conversation_id: phone,
      contact_phone: phone,
      contact_name: contactDisplayName,
      content: textContent,
      message_type: Object.keys(msg.message)[0] || 'text',
      source: 'user',
      from_me: false,
      side: 'client',
      session: sessionName,
      tenant_id: tenantId,
      timestamp: timestamp.toISOString()
    }
  };
  try {
    await connectionManager.publishEvent(tenantId, socketPayload);
  } catch (wsErr) {
    logger.warn(`Erro no WS: ${wsErr.message}`);
  }

  // 4. Fluxo IA / Bot
  try {
    const responseText = await agentService.processMessage(tenantId, textContent);
    if (responseText) {
      // Import circular evitado enviando o comando para o wrapper (whatsappCore) ou diretamente no socket
      await wsocket.sendMessage(remoteJid, { text: responseText });
      
      // Salvar resposta no DB e WS
      const botMsgId = `bot_${Date.now()}`;
      await Message.create({
        tenant_id: tenantId,
        session_name: sessionName,
        contact_phone: phone,
        contact_name: 'Bot',
        content: responseText,
        source: 'bot',
        message_type: 'text',
        external_id: botMsgId,
        ack: 2,
        timestamp: new Date()
      });
      await connectionManager.publishEvent(tenantId, {
        method: 'receive_message',
        params: { ...socketPayload.params, message_id: botMsgId, content: responseText, source: 'bot', from_me: true }
      });
    }
  } catch (e) {
    logger.error(`❌ Falha na IA do Tenant ${tenantId}: ${e.message}`);
  }
};

const wbotMessageListener = (wsocket, tenantId, sessionName) => {
  wsocket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const msg of messages) {
      try {
        await handleMessage(wsocket, tenantId, sessionName, msg);
      } catch (err) {
        logger.error(`[Tenant:${tenantId}] Erro no handleMessage: ${err.message}`);
      }
    }
  });

  wsocket.ev.on('messages.update', async (messageUpdates) => {
    // Ack updates (enviado, entregue, lido)
    for (const update of messageUpdates) {
      try {
        if (update.update.status) {
          const msgId = update.key.id;
          let ackLevel = 0;
          const s = update.update.status;
          if (s === 2) ackLevel = 1; // Sent
          if (s === 3) ackLevel = 2; // Delivered
          if (s === 4) ackLevel = 3; // Read

          await Message.updateOne({ external_id: msgId }, { $set: { ack: ackLevel } });
        }
      } catch (err) {
        // ignora erro de status
      }
    }
  });
};

module.exports = { wbotMessageListener };
