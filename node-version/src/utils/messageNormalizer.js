const logger = require('./logger');

class MessageNormalizer {
  static fromWhatsapp(tenantId, wsMessage) {
    try {
      const wsType = wsMessage.type || 'chat';
      let unifiedType = 'text';

      if (['image', 'video', 'audio', 'document'].includes(wsType)) {
        unifiedType = wsType === 'document' ? 'file' : wsType;
      }

      const content = wsMessage.body || '';

      const unifiedMsg = {
        message_id: wsMessage.id || '',
        tenant_id: tenantId,
        channel: 'whatsapp',
        from_id: wsMessage.from || '',
        to_id: wsMessage.to || '',
        message_type: unifiedType,
        content: content,
        caption: wsMessage.caption || null,
        metadata: {
          notifyName: wsMessage.notifyName || null,
          mimetype: wsMessage.mimetype || null,
          isMedia: wsMessage.isMedia || false
        },
        source: wsMessage.fromMe ? 'agent' : 'user',
        timestamp: wsMessage.t ? new Date(wsMessage.t * 1000) : new Date()
      };

      // Limpeza Básica de XSS e Emojis invisíveis (se houver regra no futuro)
      return unifiedMsg;
    } catch (e) {
      logger.error(`❌ Falha crítica ao normalizar mensagem do WhatsApp: ${e.message}`);
      throw e;
    }
  }
}

module.exports = MessageNormalizer;
