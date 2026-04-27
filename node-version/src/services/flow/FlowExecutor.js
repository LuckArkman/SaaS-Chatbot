const FlowGraph = require('./FlowInterpreter');
const NodeActions = require('./NodeActions');
const logger = require('../../utils/logger');

class FlowExecutor {
  constructor(definition) {
    this.graph = new FlowGraph(definition);
  }

  async runStep(session, userInput = null) {
    const currentNodeId = session.current_node_id;

    // 1. Trata input (Captura de variáveis em Input/Question nodes)
    if (userInput && currentNodeId) {
      const node = this.graph.nodes[currentNodeId];
      if (node && node.type === 'message') {
        const varName = node.data?.variable_name;
        if (varName) {
          session.variables = session.variables || {};
          session.variables[varName] = userInput;
          logger.debug(`📝 Variável '${varName}' capturada: ${userInput}`);
          session.markModified('variables'); // Força o mongoose a ver a alteração no objeto mixed
        }
      }
    }

    // 2. Busca o Próximo Nó
    let nextNode = this.graph.getNextNode(currentNodeId);

    if (!nextNode) {
      logger.info(`🏁 Fluxo finalizado para ${session.contact_phone}`);
      session.is_completed = true;
      await session.save();
      return;
    }

    logger.info(`⚡ Executando Nó: ${nextNode.id} (${nextNode.type})`);

    // 3. Executa Ação do Nó
    if (nextNode.type === 'message') {
      await NodeActions.executeMessageNode(nextNode, session.tenant_id, session.contact_phone, session.variables);
    } 
    else if (nextNode.type === 'ai' || nextNode.type === 'gemini') {
      await NodeActions.executeAINode(nextNode, session.tenant_id, session.contact_phone, session.variables, userInput || '');
    }
    else if (nextNode.type === 'handover') {
      await NodeActions.executeHandoverNode(session.tenant_id, session.contact_phone);
      session.is_human_support = true;
      session.is_completed = false;
    }
    else if (nextNode.type === 'ab_split') {
      const choice = Math.random() < 0.5 ? 'A' : 'B';
      logger.info(`📊 A/B Testing: ${session.contact_phone} sorteado para Versão ${choice}`);
      
      const targets = this.graph.adj[nextNode.id] || [];
      if (targets.length >= 2) {
        const nextId = choice === 'A' ? targets[0] : targets[1];
        nextNode = this.graph.nodes[nextId];
        logger.info(`⚡ Prosseguindo para variante: ${nextNode.id}`);
      }
    }

    // 4. Atualiza Estado da Sessão
    session.current_node_id = nextNode.id;
    await session.save();

    // 5. Recursividade (Se for Mensagem que NÃO espera resposta do usuário, já pula pro próximo)
    if (nextNode.type === 'message' && !nextNode.data?.expect_input) {
      await this.runStep(session);
    }
  }
}

module.exports = FlowExecutor;
