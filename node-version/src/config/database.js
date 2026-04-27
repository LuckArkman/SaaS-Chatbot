const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config({ path: '../.env' }); // Lê o mesmo .env da raiz

/**
 * 1. Configuração do PostgreSQL (Substitui SQLAlchemy + asyncpg)
 * Habilita logging de queries em ambiente de dev.
 */
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'saas_omnichannel',
  process.env.POSTGRES_USER || 'admin',
  process.env.POSTGRES_PASSWORD || 'password123',
  {
    host: process.env.POSTGRES_SERVER || '127.0.0.1',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: msg => logger.debug(msg),
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
);

/**
 * 2. Configuração do MongoDB (Substitui Beanie + Motor)
 */
const connectMongo = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/SaaS_Chatbot';
    await mongoose.connect(mongoUrl, {
      authSource: 'admin'
    });
    logger.info('💾 MongoDB conectado com sucesso via Mongoose.');
  } catch (error) {
    logger.error(`❌ Falha ao conectar no MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const testPostgres = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexão PostgreSQL OK.');
  } catch (error) {
    logger.error(`❌ Falha crítica ao conectar no PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectMongo,
  testPostgres
};
