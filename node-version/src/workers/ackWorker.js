const rabbitmqBus = require('../config/rabbitmq');
const { Message } = require('../models/nosql/Message');
const connectionManager = require('../websockets/connectionManager');
const logger = require('../utils/logger');

class AckWorker {
  async start() {
    logger.info('✔️ Iniciando Ack Tracking Worker em Segundo Plano...');
    
    await rabbitmqBus.subscribe('message_ack_queue', 'messages_exchange', 'message.ack', this.handleMessageAck.bind(this));
  }

  async handleMessageAck(payload) {
    const { tenant_id, ack } = payload;
    if (!tenant_id || !ack) return;

    // Equivalente ao WhatsAppAckStatus: 2 = SENT, 3 = DELIVERED, 4 = READ
    const externalId = ack.id;
    const wsStatus = ack.status; 
    const timestamp = ack.t || Date.now();

    let newStatus = 'sent';
    if (wsStatus === 3) newStatus = 'delivered';
    else if (wsStatus === 4) newStatus = 'read';
    else if (wsStatus === 5) newStatus = 'error';

    try {
      const msg = await Message.findOne({ 'external_id': externalId });
      
      let conversationRef = externalId;
      if (msg) {
        msg.status = newStatus;
        await msg.save();
        conversationRef = msg.contact_phone;
      } else {
        // Fallback pra criar se o Ack chegar antes da inserção por milisegundos? Não, Mongo tem upsert ou ignorar
        logger.warn(`ACK Recebido para mensagem desconhecida: ${externalId}`);
      }

      // Notificação RPC via WebSocket
      await connectionManager.broadcastToTenant(tenant_id.toUpperCase(), {
        method: 'update_message_status',
        params: {
          external_id: externalId,
          conversation_id: conversationRef,
          status: newStatus,
          timestamp: timestamp
        }
      });

      logger.debug(`🔔 ACK publicado: Msg ${externalId} → ${newStatus}`);

    } catch (e) {
      logger.error(`❌ Erro no AckWorker: ${e.message}`);
    }
  }
}

module.exports = new AckWorker();
