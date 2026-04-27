const Redis = require('ioredis');
const logger = require('../utils/logger');
require('dotenv').config({ path: '../.env' });

/**
 * 3. Configuração do Redis (Substitui redis-py assíncrono)
 * Responsável pelo controle de presença e mensageria distribuída.
 */
class RedisClient {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379/0';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Útil para workers pesados e queues
    });

    this.client.on('connect', () => {
      logger.info(`🔌 Conectado ao Redis em ${redisUrl}`);
    });

    this.client.on('error', (err) => {
      logger.error(`❌ Erro no Redis: ${err.message}`);
    });
  }

  async set(key, value, expireSeconds = null) {
    if (expireSeconds) {
      await this.client.set(key, value, 'EX', expireSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key) {
    return await this.client.get(key);
  }

  async delete(key) {
    await this.client.del(key);
  }

  async disconnect() {
    await this.client.quit();
    logger.info('🛑 Conexão com Redis encerrada.');
  }
}

const redisService = new RedisClient();
module.exports = redisService;
