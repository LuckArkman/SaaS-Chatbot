const axios = require('axios');
const logger = require('../../utils/logger');
require('dotenv').config({ path: '../../.env' });

class GeminiService {
  static MODEL = 'gemma-3-12b-it';
  static BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  static _apiUrl() {
    const model = process.env.GEMINI_MODEL || this.MODEL;
    return `${this.BASE_URL}/${model}:generateContent`;
  }

  static async generateResponse(userMessage, systemPrompt = '', conversationHistory = []) {
    const contents = [...conversationHistory];
    
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const payload = { contents };

    if (systemPrompt) {
      payload.system_instruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    payload.generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.9
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('❌ GEMINI_API_KEY não configurada no .env');
      return 'Erro: Chave da IA não configurada no backend.';
    }

    const url = `${this._apiUrl()}?key=${apiKey}`;

    try {
      const response = await axios.post(url, payload, { timeout: 30000 });
      const data = response.data;

      const candidates = data.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        if (parts.length > 0) {
          const text = parts[0].text.trim();
          logger.info(`🧠 Gemma respondeu (${text.length} chars)`);
          return text;
        }
      }

      logger.warn('⚠️ Gemma retornou resposta vazia ou sem candidatos.');
      return 'Desculpe, não consegui processar sua mensagem. Pode repetir?';

    } catch (e) {
      const status = e.response?.status;
      const responseData = e.response?.data;
      logger.error(`❌ Erro HTTP ao chamar Gemma: ${status} - ${JSON.stringify(responseData)}`);
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
        role: side === 'user' ? 'user' : 'model',
        parts: [{ text: content }]
      });
    }
    return history;
  }
}

module.exports = GeminiService;
