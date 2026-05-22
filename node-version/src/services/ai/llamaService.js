const axios = require('axios');
const logger = require('../../utils/logger');
require('dotenv').config({ path: '../../../.env' });

class LlamaService {
  static MODEL = 'llama3.2';

  static _baseUrl() {
    return process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  }

  static async generateResponse(userMessage, systemPrompt = '', conversationHistory = []) {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Adiciona o histórico
    messages.push(...conversationHistory);

    // Adiciona a mensagem atual
    messages.push({
      role: 'user',
      content: userMessage
    });

    const payload = {
      model: process.env.LLAMA_MODEL || this.MODEL,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.7
      }
    };

    const url = `${this._baseUrl()}/api/chat`;

    try {
      logger.info(`🦙 Enviando requisição para Llama no Ollama (${url})`);
      const response = await axios.post(url, payload, { timeout: 45000 });
      const data = response.data;

      const reply = data.message?.content?.trim();
      if (reply) {
        logger.info(`🧠 Llama respondeu (${reply.length} chars)`);
        return reply;
      }

      logger.warn('⚠️ Llama retornou resposta vazia.');
      return 'Desculpe, não consegui processar sua mensagem. Pode repetir?';

    } catch (e) {
      const status = e.response?.status;
      const responseData = e.response?.data;
      logger.error(`❌ Erro ao chamar Llama: ${status || e.message} - ${JSON.stringify(responseData || {})}`);
      return 'Estou com dificuldades técnicas no momento. Tente novamente em instantes.';
    }
  }

  static buildHistoryFromMessages(messages) {
    const history = [];
    for (const msg of messages) {
      const side = msg.source || 'user'; // Mongoose models use 'source: user/agent'
      const content = msg.content || '';
      
      if (!content) continue;
      
      history.push({
        role: side === 'user' ? 'user' : 'assistant',
        content: content
      });
    }
    return history;
  }

  static async ensureModelExists() {
    try {
      const url = this._baseUrl();
      logger.info(`🦙 Verificando modelo Llama 3.2 no Ollama em ${url}...`);
      const response = await axios.get(`${url}/api/tags`, { timeout: 5000 });
      const models = response.data.models || [];
      const hasLlama = models.some(m => m.name.startsWith('llama3.2'));
      
      if (!hasLlama) {
        logger.info('🦙 Modelo llama3.2 não encontrado. Iniciando download (pull) em segundo plano...');
        axios.post(`${url}/api/pull`, { name: 'llama3.2', stream: false })
          .then(() => {
            logger.info('🦙 Modelo llama3.2 baixado com sucesso!');
          })
          .catch(err => {
            logger.error(`❌ Falha ao baixar modelo llama3.2: ${err.message}`);
          });
      } else {
        logger.info('✅ Modelo Llama 3.2 já está disponível no Ollama.');
      }
    } catch (e) {
      logger.warn(`⚠️ Não foi possível conectar ao Ollama (${e.message}). Certifique-se de que o container do Ollama está rodando.`);
    }
  }
}

module.exports = LlamaService;
