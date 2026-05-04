const { AiConfig } = require('../models/sql/models');
const ragService = require('./ai/ragService');
const geminiService = require('./ai/geminiService');
const logger = require('../utils/logger');

/**
 * AgentService - Implementa o conceito de Instância MCP (Model Context Protocol) isolada por Tenant.
 * Garante que o contexto, conhecimento e ferramentas de um usuário nunca vazem para outro.
 */
class AgentService {
  /**
   * Executa a inteligência do agente para uma mensagem específica, garantindo isolamento total.
   */
  async processMessage(tenantId, userMessage, conversationHistory = []) {
    try {
      // 1. Recupera a configuração da "Instância" do Agente para este Tenant
      const config = await AiConfig.findOne({ 
        where: { tenant_id: tenantId, is_active: true } 
      });

      if (!config) {
        logger.debug(`[AgentService] Nenhuma instância de IA configurada para tenant: ${tenantId}`);
        return null;
      }

      logger.info(`[MCP Instance: ${tenantId}] Processando com modelo: ${config.model}`);

      // 2. Retrieval-Augmented Generation (RAG) - Isolado por Tenant
      let context = '';
      if (config.is_rag_enabled) {
        context = await ragService.getContext(tenantId, userMessage);
      }

      // 3. Preparação do Contexto da Instância (MCP Philosophy)
      const systemPrompt = config.system_prompt || 'Você é um assistente virtual prestativo.';
      const finalPrompt = `${systemPrompt}${context ? `\n\nCONHECIMENTO ADICIONAL:\n${context}` : ''}`;

      // 4. Delegação para o provedor de IA (Gemini, OpenAI, etc)
      let response = null;
      if (config.provider === 'gemini') {
        response = await geminiService.generateResponse(userMessage, finalPrompt, conversationHistory);
      } else {
        logger.warn(`[AgentService] Provedor ${config.provider} não implementado na instância ${tenantId}`);
      }

      return response;
    } catch (e) {
      logger.error(`❌ Erro na Instância MCP do Tenant ${tenantId}: ${e.message}`);
      return null;
    }
  }
}

module.exports = new AgentService();
