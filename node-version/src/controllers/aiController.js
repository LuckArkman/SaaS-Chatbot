const { AiConfig } = require('../models/sql/models');
const Knowledge = require('../models/nosql/Knowledge');
const logger = require('../utils/logger');

class AiController {
  /**
   * Obtém a configuração de IA do tenant
   */
  async getConfig(req, res) {
    try {
      const { tenant_id } = req.user;
      let config = await AiConfig.findOne({ where: { tenant_id } });
      
      if (!config) {
        // Cria configuração padrão se não existir
        config = await AiConfig.create({ 
          tenant_id,
          system_prompt: 'Você é um assistente virtual prestativo.'
        });
      }
      
      return res.json(config);
    } catch (e) {
      logger.error(`❌ Erro ao buscar AiConfig: ${e.message}`);
      return res.status(500).json({ error: 'Erro interno ao buscar configuração de IA' });
    }
  }

  /**
   * Salva/Atualiza a configuração de IA (Seleciona o modelo/cérebro)
   */
  async updateConfig(req, res) {
    try {
      const { tenant_id } = req.user;
      const { provider, model, api_key, system_prompt, temperature, is_rag_enabled } = req.body;
      
      let [config] = await AiConfig.findOrCreate({ where: { tenant_id } });
      
      await config.update({
        provider,
        model,
        api_key,
        system_prompt,
        temperature,
        is_rag_enabled
      });
      
      logger.info(`🧠 IA Configurada para tenant ${tenant_id}: ${provider}/${model}`);
      return res.json({ message: 'Configuração de IA atualizada com sucesso', config });
    } catch (e) {
      logger.error(`❌ Erro ao atualizar AiConfig: ${e.message}`);
      return res.status(500).json({ error: 'Erro interno ao salvar configuração' });
    }
  }

  /**
   * Alimenta o RAG (Ingestão de conhecimento)
   */
  async ingestKnowledge(req, res) {
    try {
      const { tenant_id } = req.user;
      const { content, source } = req.body;
      
      if (!content) return res.status(400).json({ error: 'Conteúdo é obrigatório' });

      // Simulação de chunking (em produção usaria um splitter melhor)
      const chunks = content.match(/[\s\S]{1,1000}/g) || [];
      
      const knowledgeEntries = chunks.map((chunk, index) => ({
        tenant_id,
        content: chunk,
        metadata: {
          source: source || 'manual_upload',
          chunk_index: index
        }
      }));

      await Knowledge.insertMany(knowledgeEntries);
      
      logger.info(`📚 Conhecimento ingerido para ${tenant_id}: ${chunks.length} fragmentos.`);
      return res.json({ 
        message: 'Conhecimento alimentado com sucesso', 
        chunks_count: chunks.length 
      });
    } catch (e) {
      logger.error(`❌ Erro ao ingerir conhecimento: ${e.message}`);
      return res.status(500).json({ error: 'Erro interno ao alimentar o cérebro' });
    }
  }

  /**
   * Limpa a base de conhecimento do tenant
   */
  async clearKnowledge(req, res) {
    try {
      const { tenant_id } = req.user;
      await Knowledge.deleteMany({ tenant_id });
      return res.json({ message: 'Base de conhecimento limpa com sucesso' });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao limpar base de conhecimento' });
    }
  }
}

module.exports = new AiController();
