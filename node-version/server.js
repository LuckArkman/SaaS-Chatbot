const express = require('express');
const http = require('http');
const cors = require('cors');
// WebSocket import movido para o connectionManager

const logger = require('./src/utils/logger');
const { testPostgres, connectMongo, sequelize } = require('./src/config/database');
const redisService = require('./src/config/redis');
const rabbitmqBus = require('./src/config/rabbitmq');
const { tenancyMiddleware } = require('./src/middlewares/tenancyMiddleware');

const app = express();
const server = http.createServer(app);

// Socket.io removido para usar Raw WebSockets (ws) para compatibilidade 100% com o Python FastAPI

// Middlewares Globais
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Suporta arquivos base64 de mídia
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(tenancyMiddleware);

const routes = require('./src/routes');
app.use('/api', routes);

// Configuração do Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SaaS Chatbot API (Node.js Monolith)',
      version: '2.0.0',
      description: 'Documentação automática da API migrada para Node.js'
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Local Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rota de Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Monolith OK', version: '2.0.0' });
});

// Inicializador de todas as conexões
const connectionManager = require('./src/websockets/connectionManager');

const bootstrap = async () => {
  try {
    logger.info('🚀 Iniciando SaaS Chatbot Monolith (Node.js)...');
    
    // 0. Inicializa WebSockets Nativos (ws)
    connectionManager.init(server);

    // 1. Relacional
    await testPostgres();
    // Em dev, podemos usar sequelize.sync(), mas usaremos migrations em prod.
    await sequelize.sync(); 
    logger.info('✅ Tabelas PostgreSQL verificadas/sincronizadas.');

    // 2. NoSQL
    await connectMongo();

    // 3. Filas e Cache
    await rabbitmqBus.connect();
    // Redis conecta automaticamente na instância
    
    // 4. Workers Nativos (Background Jobs e Integração WhatsApp)
    const outgoingWorker = require('./src/workers/outgoingWorker');
    const flowWorker = require('./src/workers/flowWorker');
    const ackWorker = require('./src/workers/ackWorker');
    const campaignWorker = require('./src/workers/campaignWorker');
    
    await outgoingWorker.start();
    await flowWorker.start();
    await ackWorker.start();
    await campaignWorker.start();
    logger.info('⚙️ Workers assíncronos carregados no Event Loop.');

    // 4.5. Restaura Sessões do WhatsApp ativas
    const whatsappService = require('./src/services/whatsappCore');
    await whatsappService.initializeActiveSessions();

    // 5. Cron Jobs
    const BillingNotificationService = require('./src/services/billing/billingNotificationService');
    setInterval(async () => {
      try {
        await BillingNotificationService.processBillingHeartbeat();
      } catch (err) {
        logger.error(`Erro no Cron de Billing: ${err.message}`);
      }
    }, 1000 * 60 * 60 * 12); // A cada 12 horas
    
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🔥 Servidor HTTP & WebSocket rodando na porta ${PORT}`);
    });

  } catch (error) {
    logger.error(`❌ Falha crítica ao inicializar Monolito: ${error.message}`);
    process.exit(1);
  }
};

// Captura de sinais de parada (Graceful Shutdown)
process.on('SIGINT', async () => {
  logger.info('🛑 Encerrando SaaS Chatbot Monolith...');
  await rabbitmqBus.disconnect();
  await redisService.disconnect();
  process.exit(0);
});

bootstrap();
