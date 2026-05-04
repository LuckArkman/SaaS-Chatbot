const logger = require('../utils/logger');
const { tenancyContext } = require('../middlewares/tenancyMiddleware');
const connectionManager = require('../websockets/connectionManager');
const { Message } = require('../models/nosql/Message');
const { Contact } = require('../models/sql/models');
const MessageNormalizer = require('../utils/messageNormalizer');
const sessionMapper = require('../utils/sessionMapper');

/**
 * Endpoint de Gateway.
 * Tradução criteriosa do 'src/api/v1/endpoints/gateway.py'.
 */

// Extrai o Tenant UUID seguro (idêntico ao gateway.py: _resolve_tenant_id)
function resolveTenantId(payload) {
  let rawStr = '';
  if (payload.tenantId) rawStr = payload.tenantId;
  else if (payload.tenant_id) rawStr = payload.tenant_id;
  else if (payload.session) rawStr = payload.session;
  
  if (!rawStr) return null;
  
  // Usa o SessionMapper para resolver chaves rotacionadas ou extrair o ID de forma robusta
  return sessionMapper.getTenantId(rawStr);
}

const incomingWebhook = async (req, res) => {
  const { channel_type } = req.params;
  const payload = req.body;

  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ detail: 'Invalid JSON' });
  }

  const resolvedTenantId = resolveTenantId(payload);

  if (!resolvedTenantId) {
    logger.error(`[Gateway] Webhook sem Tenant ID identificável. session='${payload.session}'`);
    return res.status(202).json({ success: false, status: 'missing_tenant' });
  }

  // O Express retornará o 202 IMEDIATAMENTE (como FastApi status_code=HTTP_202_ACCEPTED)
  res.status(202).json({ success: true, status: 'processing' });

  // Todo o processamento a seguir roda no Event Loop protegido pelo AsyncLocalStorage (Multi-Tenant)
  await tenancyContext.run({ tenantId: resolvedTenantId.toUpperCase() }, async () => {
    try {
      if (channel_type !== 'whatsapp') return;

      const eventEnum = payload.event ? String(payload.event).toLowerCase() : 'messages.upsert';
      const msgBody = payload.payload || payload.data || {};
      
      logger.debug(`[Gateway] Evento '${eventEnum}' recebido | tenant='${resolvedTenantId}'`);

      if (eventEnum === 'messages.upsert' || eventEnum === 'on_message') {
        // Usa o MessageNormalizer para limpar o objeto
        const unifiedMsg = MessageNormalizer.fromWhatsapp(resolvedTenantId.toUpperCase(), msgBody);
        
        const isFromMe = unifiedMsg.source === 'agent';
        
        let targetJid = isFromMe ? msgBody.to : msgBody.from;
        let participantJid = msgBody.participant;

        let contactPhone = '';
        if (targetJid && targetJid.includes('@g.us') && participantJid) {
          contactPhone = participantJid.split('@')[0];
        } else if (targetJid) {
          contactPhone = targetJid.split('@')[0];
        }

        contactPhone = contactPhone.replace(/\D/g, ''); // Mantém só digitos

        if (!contactPhone) {
          logger.warn(`[Gateway] JID inválido ignorado | tenant='${resolvedTenantId}'`);
          return;
        }

        // Busca nome local do Contato (Isolado no tenant atual!)
        let contactDisplayName = null;
        try {
          const localContact = await Contact.findOne({ where: { phone_number: contactPhone } });
          if (localContact && localContact.full_name) {
            contactDisplayName = localContact.full_name;
          }
        } catch (e) {
          logger.error(`[Gateway] Falha ao consultar nome do contato SQL: ${e.message}`);
        }

        if (!contactDisplayName) {
          contactDisplayName = msgBody.pushName || msgBody.notifyName || `Contato ${contactPhone.slice(-4)}`;
        }

        // A mensagem em si já é gravada pelo Baileys internamente no monolito se vier de WhatsApp nativo.
        // Este Webhook aqui só entra em ação se vier de algum Bridge externo rodando paralelo.
        // Dispara o WebSocket RPC para o frontend do SaaS
        const socketPayload = {
          method: 'receive_message',
          params: {
            message_id: msgBody.id?.id || msgBody.id || new Date().getTime().toString(),
            conversation_id: targetJid,
            contact_phone: contactPhone,
            contact: {
              phone: contactPhone,
              name: contactDisplayName,
              profile_picture: null
            },
            content: msgBody.conversation || msgBody.text || '[Mídia]',
            message_type: 'text',
            source: isFromMe ? 'agent' : 'user',
            timestamp: new Date().toISOString()
          }
        };

        await connectionManager.broadcastToTenant(resolvedTenantId, socketPayload);
      }
    } catch (e) {
      logger.error(`[Gateway] Falha não tratada no processamento background: ${e.message}`);
    }
  });
};

module.exports = {
  incomingWebhook
};
