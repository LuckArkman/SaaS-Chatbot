const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const redisService = require('../config/redis');
const RateLimitLog = require('../models/nosql/RateLimitLog');
const logger = require('../utils/logger');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limite cada IP a 5 tentativas por janela
  standardHeaders: true, 
  legacyHeaders: false,
  
  // Utiliza Redis para distribuir os limites de taxa entre processos/containers
  store: new RedisStore({
    sendCommand: (...args) => redisService.client.call(...args),
    prefix: 'rl:login:'
  }),
  
  message: {
    success: false,
    message: 'Muitas tentativas de login a partir deste IP. Por favor, tente novamente após 15 minutos.'
  },
  
  // Custom handler que roda quando o limite é excedido
  handler: async (req, res, next, options) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const emailAttempt = req.body?.email || req.body?.username || 'unknown';
    
    logger.warn(`[Segurança] Bloqueio Rate Limit ativado para o IP: ${clientIp} no e-mail: ${emailAttempt}`);
    
    try {
      await RateLimitLog.create({
        ip: clientIp,
        email_attempt: emailAttempt,
        endpoint: req.originalUrl,
        user_agent: req.headers['user-agent']
      });
    } catch (err) {
      logger.error(`[Segurança] Erro ao salvar RateLimitLog no MongoDB: ${err.message}`);
    }
    
    res.status(options.statusCode).json(options.message);
  }
});

module.exports = {
  loginRateLimiter
};
