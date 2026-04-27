const axios = require('axios');
const logger = require('../../utils/logger');
const { Message } = require('../../models/nosql/Message');
const { User } = require('../../models/sql/models');
const redisService = require('../../config/redis');
const connectionManager = require('../../websockets/connectionManager');
const whatsappService = require('../whatsappCore');
const GeminiService = require('../ai/geminiService');

class ConditionEvaluator {
  static injectVariables(text, variables) {
    if (!text || typeof text !== 'string') return text || '';
    let processed = text;
    for (const [key, val] of Object.entries(variables || {})) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, val);
    }
    return processed;
  }
}

class NodeActions {
  
  static async executeMessageNode(node, tenantId, contactPhone, variables) {
    const rawText = node.data?.text || '';
    const processedText = ConditionEvaluator.injectVariables(rawText, variables);

    // Grava histórico no Mongoose (Substitui MessageHistoryService.record_message)
    await Message.create({
      tenant_id: tenantId,
      session_name: `tenant_${tenantId}`,
      contact_phone: contactPhone,
      content: processedText,
      source: 'agent', // Bot actions are 'agent' side
      message_type: 'text'
    });

    // CHAMADA NATIVA: Em vez de HTTP ou RabbitMQ, a gente chama o Baileys que tá em memória.
    await whatsappService.sendMessage(`tenant_${tenantId}`, contactPhone, processedText);
  }

  static async executeHandoverNode(tenantId, contactPhone) {
    // 1. Busca atendente disponível
    let assignedAgent = null;
    try {
      const agents = await User.findAll({ 
        where: { tenant_id: tenantId, is_agent: true, is_active: true },
        ignoreTenant: true 
      });

      for (const candidate of agents) {
        const isOnline = await redisService.get(`presence:${tenantId}:${candidate.id}`);
        if (isOnline && candidate.current_chats_count < candidate.max_concurrent_chats) {
          candidate.current_chats_count += 1;
          await candidate.save({ ignoreTenant: true });
          assignedAgent = candidate;
          break;
        }
      }
    } catch (e) {
      logger.error(`[NodeActions] Falha ao buscar atendente: ${e.message}`);
    }

    // 2. Transmite websocket para o Frontend avisando que o chat entrou na fila de humano
    await connectionManager.broadcastToTenant(tenantId, {
      method: 'chat_assigned',
      params: {
        contact_phone: contactPhone,
        agent_id: assignedAgent ? assignedAgent.id : null
      }
    });

    logger.info(`[NodeActions] 👥 Handover para ${contactPhone}. Agente: ${assignedAgent ? assignedAgent.id : 'Fila Geral'}`);
  }

  static async executeAINode(node, tenantId, contactPhone, variables, userInput) {
    const systemPrompt = node.data?.system_prompt || 'Você é um assistente virtual prestativo e simpático.';
    const processedInput = ConditionEvaluator.injectVariables(userInput, variables);

    // Busca contexto recente
    const recentMessages = await Message.find({ contact_phone: contactPhone })
      .sort({ timestamp: -1 })
      .limit(10);
    
    // Inverte para ordem cronológica e constrói o histórico
    recentMessages.reverse();
    const conversationHistory = GeminiService.buildHistoryFromMessages(recentMessages);

    // Chama o serviço do Gemma 3 12B
    const aiReply = await GeminiService.generateResponse(processedInput, systemPrompt, conversationHistory);

    // Grava no Mongoose
    await Message.create({
      tenant_id: tenantId,
      session_name: `tenant_${tenantId}`,
      contact_phone: contactPhone,
      content: aiReply,
      source: 'agent',
      message_type: 'text'
    });

    // Envia nativamente
    await whatsappService.sendMessage(`tenant_${tenantId}`, contactPhone, aiReply);
  }
}

module.exports = NodeActions;
