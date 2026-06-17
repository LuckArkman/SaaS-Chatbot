const request = require('supertest');
const express = require('express');

// 1. Mock de serviços externos para evitar falhas de rede (Redis, RabbitMQ, MongoDB e Axios)
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      post: jest.fn().mockResolvedValue({ data: { messages: [{ id: 'mock_wamid_123' }] } })
    }))
  };
});

jest.mock('../src/config/redis', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  getClient: jest.fn()
}));

jest.mock('../src/config/rabbitmq', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  publish: jest.fn()
}));

// 2. Mock dos Modelos do Banco de Dados
const mockWhatsAppInstance = {
  findOne: jest.fn(),
  update: jest.fn()
};

const mockContact = {
  findOne: jest.fn(),
  create: jest.fn()
};

const mockMessage = {
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn()
};

jest.mock('../src/models/sql/models', () => {
  return {
    WhatsAppInstance: mockWhatsAppInstance,
    Contact: mockContact
  };
});

jest.mock('../src/models/nosql/Message', () => mockMessage);

jest.mock('../src/websockets/connectionManager', () => ({
  publishEvent: jest.fn()
}));

jest.mock('../src/services/ai/agentService', () => ({
  processMessage: jest.fn().mockResolvedValue('Mocked AI Response')
}));


// Inicializa a aplicação Express para testes de rota
const app = express();
app.use(express.json());

// Middlewares e Rotas mockados minimamente
app.use((req, res, next) => {
  req.tenantId = 'test_tenant';
  next();
});

const cloudApiWebhookController = require('../src/controllers/cloudApiWebhookController');
app.get('/api/v1/whatsapp/webhook', cloudApiWebhookController.verifyWebhook.bind(cloudApiWebhookController));
app.post('/api/v1/whatsapp/webhook', cloudApiWebhookController.handleWebhook.bind(cloudApiWebhookController));

const whatsappCore = require('../src/services/whatsappCore');


describe('End-to-End Meta Cloud API Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    process.env.WHATSAPP_CLOUD_VERIFY_TOKEN = 'secret_token';
  });

  test('Deve validar o Webhook (GET /webhook)', async () => {
    const res = await request(app)
      .get('/api/v1/whatsapp/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'secret_token',
        'hub.challenge': '12345'
      });
      
    expect(res.status).toBe(200);
    expect(res.text).toBe('12345');
  });

  test('Deve rejeitar a verificação com Token inválido', async () => {
    const res = await request(app)
      .get('/api/v1/whatsapp/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': '12345'
      });
      
    expect(res.status).toBe(403);
  });

  test('Deve processar mensagem recebida e enviar resposta do Bot (POST /webhook)', async () => {
    
    // Simula encontrar o Tenant pelo Phone ID
    mockWhatsAppInstance.findOne.mockResolvedValue({
      tenant_id: 'test_tenant',
      session_name: 'tenant_test_tenant',
      cloud_phone_id: '1000000',
      cloud_api_token: 'valid_token'
    });

    // Simula Contato não existente (forçando a criação)
    mockContact.findOne.mockResolvedValue(null);
    mockContact.create.mockResolvedValue({ full_name: 'Usuário Teste' });

    // Simula Mensagem não duplicada
    mockMessage.findOne.mockResolvedValue(null);

    // Spy no envio do whatsappCore para ver se o webhook repassou a resposta do Bot
    jest.spyOn(whatsappCore, 'sendMessage').mockResolvedValue({ success: true });

    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '1000000',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '1000000' },
            contacts: [{ profile: { name: 'João' }, wa_id: '5511999999999' }],
            messages: [{
              from: '5511999999999',
              id: 'wamid.123',
              timestamp: '1718640000',
              text: { body: 'Oi, Bot!' },
              type: 'text'
            }]
          }
        }]
      }]
    };

    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.text).toBe('EVENT_RECEIVED');

    // Validações
    expect(mockWhatsAppInstance.findOne).toHaveBeenCalled();
    expect(mockContact.create).toHaveBeenCalledWith(expect.objectContaining({ phone_number: '5511999999999' }));
    expect(mockMessage.create).toHaveBeenCalledWith(expect.objectContaining({ content: 'Oi, Bot!', contact_phone: '5511999999999' }));
    
    // Verifica se a resposta da IA (Mockada) foi encaminhada para o WhatsAppCore Enviar
    expect(whatsappCore.sendMessage).toHaveBeenCalledWith('test_tenant', '5511999999999', 'Mocked AI Response');
  });

  test('whatsappCore.js deve montar a requisição HTTP correta para o Facebook', async () => {
    // Configura o banco pra devolver a chave do facebook
    mockWhatsAppInstance.findOne.mockResolvedValue({
      tenant_id: 'test_tenant',
      cloud_phone_id: '1000000',
      cloud_api_token: 'EAA_TEST_TOKEN'
    });

    const axios = require('axios');
    const result = await whatsappCore.sendMessage('test_tenant', '5511999999999', 'Mensagem de Volta', 'text');
    
    expect(result.success).toBe(true);
    expect(result.message_id).toBe('mock_wamid_123');

    // Acessando o mock da instância do Axios retornada pelo axios.create
    const axiosMockInstance = axios.create.mock.results[0].value;
    expect(axiosMockInstance.post).toHaveBeenCalledWith('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '5511999999999',
      type: 'text',
      text: { preview_url: false, body: 'Mensagem de Volta' }
    });
  });

});
