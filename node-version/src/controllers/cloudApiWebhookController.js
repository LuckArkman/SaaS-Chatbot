const logger = require('../utils/logger');
const { WhatsAppInstance, Contact } = require('../models/sql/models');
const Message = require('../models/nosql/Message');
const connectionManager = require('../websockets/connectionManager');
const phoneUtils = require('../utils/phoneUtils');
const agentService = require('../services/ai/agentService');
const whatsappService = require('../services/whatsappCore');

class CloudApiWebhookController {
  
  // O GET é usado apenas uma vez (ou periodicamente) pela Meta para verificar se você é dono do webhook
  verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const myVerifyToken = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === myVerifyToken) {
        logger.info('✅ Webhook verificado pela Meta com sucesso!');
        return res.status(200).send(challenge);
      } else {
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  }

  async handleWebhook(req, res) {
    const body = req.body;

    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value) {
        const changeValue = body.entry[0].changes[0].value;
        const phoneId = changeValue.metadata.phone_number_id;

        // Descobrir qual tenant é dono deste phoneId
        const instance = await WhatsAppInstance.findOne({ where: { cloud_phone_id: phoneId } });
        if (!instance) {
          logger.warn(`Webhook recebido para Phone ID desconhecido: ${phoneId}`);
          return res.sendStatus(200); // Sempre retorna 200 pro Facebook
        }

        const tenantId = instance.tenant_id;
        const sessionId = instance.session_name;

        // É um recido de leitura / status da mensagem?
        if (changeValue.statuses) {
          const statusObj = changeValue.statuses[0];
          await this.handleMessageStatus(tenantId, sessionId, statusObj);
        }
        
        // É uma nova mensagem chegando?
        if (changeValue.messages) {
          const messageObj = changeValue.messages[0];
          const contactObj = changeValue.contacts ? changeValue.contacts[0] : null;
          await this.handleIncomingMessage(tenantId, sessionId, messageObj, contactObj);
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.sendStatus(404);
    }
  }

  async handleMessageStatus(tenantId, sessionId, statusObj) {
    // statusObj.status pode ser 'sent', 'delivered', 'read', 'failed'
    // Aqui você pode atualizar o MongoDB e notificar o WebSocket
    logger.info(`[Tenant:${tenantId}] Status de mensagem ${statusObj.id}: ${statusObj.status}`);
    
    let ackLevel = 1;
    if (statusObj.status === 'delivered') ackLevel = 2;
    if (statusObj.status === 'read') ackLevel = 3;

    try {
      await Message.updateOne(
        { external_id: statusObj.id },
        { $set: { ack: ackLevel } }
      );
    } catch(e) {}
  }

  async handleIncomingMessage(tenantId, sessionId, messageObj, contactObj) {
    // 1. Identificar o remetente
    const fromPhone = messageObj.from; 
    let phone = phoneUtils.normalizeToDb(fromPhone);
    const pushName = contactObj?.profile?.name || 'Contato Desconhecido';
    
    // 2. Extrair o Conteúdo da Mensagem
    const messageType = messageObj.type; // text, image, document, audio, etc
    let textContent = '[Mídia/Outro]';
    let mediaUrl = null;

    if (messageType === 'text') {
      textContent = messageObj.text.body;
    } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
      const mediaId = messageObj[messageType].id;
      // Para baixar a mídia, precisamos fazer um GET na Graph API usando o mediaId
      textContent = messageObj[messageType].caption || `[Mídia: ${messageType}]`;
      mediaUrl = `MEDIA_ID:${mediaId}`; 
    } else if (messageType === 'button' || messageType === 'interactive') {
      textContent = messageObj.button?.text || messageObj.interactive?.button_reply?.title || '[Interativo]';
    }

    const msgId = messageObj.id;
    const timestamp = messageObj.timestamp * 1000;

    // 3. Salvar Contato se não existir
    let dbContact = null;
    try {
      dbContact = await Contact.findOne({ where: { phone_number: phone, tenant_id: tenantId } });
      if (!dbContact) {
        dbContact = await Contact.create({
          phone_number: phone,
          full_name: pushName !== 'Contato Desconhecido' ? pushName : `WhatsApp ${phone.slice(-4)}`,
          tenant_id: tenantId,
          is_group: false // Cloud API nativamente não suporta grupos padrão ainda da mesma forma
        });
      }
    } catch (e) {}

    // 4. Salvar Mensagem no MongoDB
    try {
      const isDuplicate = await Message.findOne({ tenant_id: tenantId, external_id: msgId });
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
          external_id: msgId,
          ack: 0,
          timestamp: new Date(timestamp)
        });
      }
    } catch (e) {}

    // 5. Enviar WebSocket pro front-end
    let contactDisplayName = dbContact ? dbContact.full_name : pushName;
    const socketPayload = {
      method: 'receive_message',
      params: {
        message_id: msgId,
        conversation_id: phone,
        contact_phone: phone,
        contact_name: contactDisplayName,
        content: textContent,
        message_type: messageType,
        source: 'user',
        from_me: false,
        side: 'client',
        session: sessionId,
        tenant_id: tenantId,
        timestamp: new Date(timestamp).toISOString()
      }
    };
    try {
      await connectionManager.publishEvent(tenantId, socketPayload);
    } catch (wsErr) {}

    // 6. Processamento IA / Bot
    try {
      const responseText = await agentService.processMessage(tenantId, textContent);
      if (responseText) {
        await whatsappService.sendMessage(tenantId, phone, responseText);
      }
    } catch (e) {
      logger.error(`❌ Falha na IA do Tenant ${tenantId}: ${e.message}`);
    }
  }
}

module.exports = new CloudApiWebhookController();
