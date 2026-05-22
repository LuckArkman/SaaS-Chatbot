const amqp = require('amqplib');
const logger = require('../utils/logger');
require('dotenv').config({ path: '../.env' });

/**
 * 4. Configuração do RabbitMQ (Substitui aio-pika / bus.py)
 * Gerencia a fila de saída, rotinas do bot e retentativas (backoff).
 */
class RabbitMQBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.url = process.env.RABBITMQ_URL || 'amqp://admin:password123@127.0.0.1/';
  }

  async connect(retries = 10, delayMs = 5000) {
    for (let i = 1; i <= retries; i++) {
      try {
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();
        logger.info(`🐰 Conectado ao RabbitMQ em ${this.url}`);
        
        // Garante a existência da Exchange principal
        await this.channel.assertExchange('messages_exchange', 'direct', { durable: true });
        await this.channel.assertExchange('campaign_exchange', 'direct', { durable: true });
        return;
      } catch (err) {
        logger.warn(`⏳ Tentativa ${i}/${retries} falhou ao conectar no RabbitMQ: ${err.message}`);
        if (i === retries) throw err;
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }

  async publish(exchange, routingKey, message) {
    if (!this.channel) throw new Error('Canal RabbitMQ não inicializado');
    const buffer = Buffer.from(JSON.stringify(message));
    const success = this.channel.publish(exchange, routingKey, buffer, { persistent: true });
    if (!success) {
      logger.warn('[Bus] Falha ao publicar mensagem, canal saturado (backpressure).');
    }
  }

  async subscribe(queueName, exchange, routingKey, callback) {
    if (!this.channel) throw new Error('Canal RabbitMQ não inicializado');
    
    // Declara a fila
    await this.channel.assertQueue(queueName, { durable: true });
    
    // Associa a fila à exchange pela chave de roteamento
    await this.channel.bindQueue(queueName, exchange, routingKey);
    
    // Qos garante que o worker pegue X msgs por vez (Pre-fetch count)
    await this.channel.prefetch(10);
    
    logger.info(`👂 Escutando a fila: ${queueName} [RoutingKey: ${routingKey}]`);
    
    this.channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          await callback(payload);
          this.channel.ack(msg); // Sucesso -> Retira da fila
        } catch (error) {
          logger.error(`[Bus] Erro ao processar mensagem na fila ${queueName}: ${error.message}`);
          this.channel.nack(msg, false, false); // Falha -> Descarta ou Dead Letter
        }
      }
    });
  }

  async disconnect() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    logger.info('🛑 RabbitMQ desconectado.');
  }
}

const rabbitmqBus = new RabbitMQBus();
module.exports = rabbitmqBus;
