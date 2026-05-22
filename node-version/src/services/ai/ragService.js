const Knowledge = require('../../models/nosql/Knowledge');
const logger = require('../../utils/logger');

class RagService {
  /**
   * Busca os fragmentos de conhecimento mais relevantes para uma mensagem
   */
  async getContext(tenantId, userMessage, limit = 3) {
    try {
      // Busca simples por texto (regex) - Em produção usaria busca vetorial com embeddings
      // Mas para o MVP com MongoDB, usaremos uma busca textual básica ou Atlas Search
      const searchTerms = userMessage.split(' ').filter(word => word.length > 3);
      
      if (searchTerms.length === 0) return '';

      const query = {
        tenant_id: tenantId,
        $or: searchTerms.map(term => ({ content: { $regex: term, $options: 'i' } }))
      };

      const results = await Knowledge.find(query).limit(limit).lean();
      
      if (results.length === 0) {
        logger.debug(`[RAG] Nenhum contexto encontrado para tenant ${tenantId}`);
        return '';
      }

      const context = results.map(r => r.content).join('\n---\n');
      logger.info(`[RAG] Contexto recuperado para ${tenantId}: ${results.length} fragmentos.`);
      
      return `\nCONTEXTO ADICIONAL (Use apenas se relevante):\n${context}\n`;
    } catch (e) {
      logger.error(`❌ Erro no RagService: ${e.message}`);
      return '';
    }
  }
}

module.exports = new RagService();
