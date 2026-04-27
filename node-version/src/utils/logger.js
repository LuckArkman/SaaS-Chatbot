const pino = require('pino');

/**
 * Sistema de Logging Centralizado de Alta Performance.
 * Substitui o Loguru do Python. Em produção, os logs são em JSON.
 * Em desenvolvimento, usa o pino-pretty para leitura humana.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
});

module.exports = logger;
