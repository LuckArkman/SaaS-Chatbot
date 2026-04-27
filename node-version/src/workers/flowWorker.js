const rabbitmqBus = require('../config/rabbitmq');
const { Flow, SessionState } = require('../models/nosql/Flow');
const logger = require('../utils/logger');
const { tenancyContext } = require('../middlewares/tenancyMiddleware');

/**
 * Worker de Automação de Fluxos (FlowEngine / Chatbot).
 */
class FlowWorker {
  async start() {
    logger.info('🤖 Iniciando Flow Engine Worker no RabbitMQ...');
    
    // Escuta a fila de mensagens INCOMING (recebidas via Baileys)
    await rabbitmqBus.subscribe(
      'incoming_flow_queue',
      'messages_exchange',
      'message.incoming',
      this.handleIncomingMessage.bind(this)
    );
  }

  async handleIncomingMessage(payload) {
    const { tenant_id, session_name, from, content } = payload;
    
    if (!tenant_id || !content) return;

    await tenancyContext.run({ tenantId: tenant_id.toUpperCase() }, async () => {
      try {
        // Remove @s.whatsapp.net se houver
        const contactPhone = from.includes('@') ? from.split('@')[0] : from;

        // A mensagem já foi salva no MongoDB pelo whatsappCore! (Zero duplicação)
        
        // 1. Busca fluxo ativo do Tenant
        const flow = await Flow.findOne({ is_active: true });
        
        if (!flow) {
          logger.warn(`⚠️ Nenhum fluxo ativo encontrado para o Tenant ${tenant_id}`);
          return;
        }

        // 2. Busca ou Cria a sessão do contato neste fluxo
        let session = await SessionState.findOne({ 
          contact_phone: contactPhone, 
          flow_id: flow._id.toString() 
        });

        if (!session) {
          // Busca o nó inicial (trigger / inicio)
          const startNode = flow.nodes.find(n => n.type === 'start' || n.type === 'trigger');
          const startingNodeId = startNode ? startNode.id : 'start';

          session = await SessionState.create({
            tenant_id,
            contact_phone: contactPhone,
            flow_id: flow._id.toString(),
            current_node_id: startingNodeId,
            variables: {}
          });
          logger.info(`🆕 Nova sessão de fluxo iniciada para ${contactPhone}`);
        }

        // 3. Handover Check
        if (session.is_human_support) {
          logger.debug(`👥 Handover ativo para ${contactPhone}. Fluxo pausado.`);
          session.last_interaction = new Date();
          await session.save();
          return;
        }

        // 4. Execução do Fluxo
        const FlowExecutor = require('../services/flow/FlowExecutor');
        
        logger.info(`🔄 Rodando FlowExecutor para nó '${session.current_node_id}' - Mensagem: "${content.substring(0, 20)}"`);
        
        const executor = new FlowExecutor({ nodes: flow.nodes, edges: flow.edges });
        await executor.runStep(session, content);

      } catch (error) {
        logger.error(`❌ Erro fatal no FlowWorker: ${error.message}`);
      }
    });
  }
}

const flowWorker = new FlowWorker();
module.exports = flowWorker;
