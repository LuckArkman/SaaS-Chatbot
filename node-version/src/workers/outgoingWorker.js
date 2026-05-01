const rabbitmqBus = require('../config/rabbitmq');
const whatsappService = require('../services/whatsappCore');
const { WhatsAppInstance } = require('../models/sql/models');
const logger = require('../utils/logger');
const { tenancyContext } = require('../middlewares/tenancyMiddleware');

/**
 * Worker de Mensagens de Saída (Outgoing).
 * Consome a fila do RabbitMQ e dispara nativamente via Baileys.
 */
class OutgoingMessageWorker {
  async start() {
    logger.info('📤 Iniciando Outgoing Message Worker no RabbitMQ...');
    
    await rabbitmqBus.subscribe(
      'outgoing_whatsapp_queue',
      'messages_exchange',
      'message.outgoing',
      this.processOutgoing.bind(this)
    );
  }

  async processOutgoing(payload) {
    const { tenant_id, to, content, type = 'text' } = payload;
    
    if (!tenant_id || !to || !content) {
      logger.error(`❌ Payload inválido descartado: ${JSON.stringify(payload)}`);
      return;
    }

    // 🔧 FIX CRÍTICO #1: Aplica o contexto de Tenancy para garantir queries seguras
    await tenancyContext.run({ tenantId: tenant_id.toUpperCase() }, async () => {
      
      const instance = await WhatsAppInstance.findOne({
        where: { tenant_id: tenant_id.toUpperCase(), is_active: true },
        order: [['id', 'DESC']]
      });

      if (!instance) {
        logger.error(`❌ Sem instância ativa para tenant '${tenant_id}'. Mensagem descartada.`);
        return;
      }

      if (instance.status === 'disconnected') {
        logger.warn(`⚠️ Instância '${instance.session_name}' desconectada. Mensagem para '${to}' abortada.`);
        return;
      }

      // 🚀 Lógica de Envio com RETRY (Exponential Backoff)
      const maxRetries = 3;
      let retryDelay = 1000;
      let responseBridge = { success: false, error: 'Timeout or No Response' };

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`📤 Tentativa ${attempt}/${maxRetries} | Sessão: '${instance.session_name}'`);
          
          if (type === 'text') {
            // CHAMADA NATIVA (Zero latência HTTP)
            responseBridge = await whatsappService.sendMessage(instance.session_name, to, content);
            if (responseBridge.success) break;
          } else {
            logger.warn(`⚠️ Tipo '${type}' ainda não suportado no Monolito.`);
            return;
          }
        } catch (e) {
          logger.warn(`⚠️ Falha na tentativa ${attempt}: ${e.message}`);
        }

        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, retryDelay));
          retryDelay *= 2;
        }
      }

      // 🎯 Pós-processamento e notificação WebSocket (A implementar no ConnectionManager)
      if (responseBridge.success) {
        logger.info(`✅ Mensagem entregue ao WhatsApp Core | tenant='${tenant_id}' | para='${to}' | msg_id='${responseBridge.message_id}'`);
        // TODO: Emitir evento Socket.io de confirmação de envio (status='sent')
      } else {
        logger.error(`❌ FALHA TOTAL após ${maxRetries} tentativas | tenant='${tenant_id}'`);
      }

    });
  }
}

const outgoingWorker = new OutgoingMessageWorker();
module.exports = outgoingWorker;
