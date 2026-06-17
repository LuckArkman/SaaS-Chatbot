const { sequelize } = require('../src/config/database');
const mongoose = require('mongoose');
const { WhatsAppInstance, Contact } = require('../src/models/sql/models');
const Message = require('../src/models/nosql/Message');
const whatsappService = require('../src/services/whatsappCore');
const { getWbot, removeWbot } = require('../src/libs/wbot');
const { wbotMessageListener } = require('../src/services/wbotMessageListener');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const TENANT_ID = 'tenant_test_e2e';
const SESSION_NAME = `tenant_${TENANT_ID}`;

beforeAll(async () => {
  // Conectar aos bancos se necessário, mas eles costumam conectar na importação
  // Se mongoose não conectou ainda:
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-chatbot');
  }
  await sequelize.authenticate();

  // Limpeza prévia
  await WhatsAppInstance.destroy({ where: { tenant_id: TENANT_ID } });
  await Contact.destroy({ where: { tenant_id: TENANT_ID } });
  await Message.deleteMany({ tenant_id: TENANT_ID });
  
  const sessionDir = path.join(__dirname, '..', 'sessions', `${TENANT_ID}_${SESSION_NAME}`);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
});

afterAll(async () => {
  // Limpeza final
  await removeWbot(TENANT_ID); // Só pra garantir
  await WhatsAppInstance.destroy({ where: { tenant_id: TENANT_ID } });
  await Contact.destroy({ where: { tenant_id: TENANT_ID } });
  await Message.deleteMany({ tenant_id: TENANT_ID });
  const sessionDir = path.join(__dirname, '..', 'sessions', `${TENANT_ID}_${SESSION_NAME}`);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  await sequelize.close();
  await mongoose.disconnect();
});

describe('E2E Baileys Integration', () => {

  it('1. Deve inicializar a sessão do Baileys e criar a instância no DB', async () => {
    // Isso emula o botController.startBot()
    const result = await whatsappService.initializeSession(TENANT_ID, SESSION_NAME);
    expect(result.success).toBe(true);

    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: TENANT_ID } });
    expect(instance).not.toBeNull();
    expect(instance.status).toBe('CONNECTING'); // Ou já em QRCODE se for muito rápido, mas CONNECTING é esperado.
    
    // A pasta deve ter sido criada
    const sessionDir = path.join(__dirname, '..', 'sessions', `${TENANT_ID}_${SESSION_NAME}`);
    expect(fs.existsSync(sessionDir)).toBe(true);
  }, 10000);

  it('2. Deve obter o Wbot instanciado', async () => {
    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: TENANT_ID } });
    const wsocket = getWbot(instance.id);
    expect(wsocket).not.toBeNull();
    expect(typeof wsocket.sendMessage).toBe('function');
  });

  it('3. O Listener deve tratar uma mensagem fake corretamente', async () => {
    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: TENANT_ID } });
    const wsocket = getWbot(instance.id);

    // Sobrescrever o método sendMessage apenas para este teste para não disparar a IA tentado enviar pro baileys mock
    const sendMsgMock = jest.fn();
    wsocket.sendMessage = sendMsgMock;

    // Disparamos manualmente um evento na "ev"
    const fakeMessageEvent = {
      messages: [{
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: false,
          id: 'TEST_MSG_ID_123'
        },
        pushName: 'Fulano de Tal',
        messageTimestamp: Date.now() / 1000,
        message: {
          conversation: 'Olá, testando o E2E!'
        }
      }],
      type: 'notify'
    };

    // Emitir o evento
    wsocket.ev.emit('messages.upsert', fakeMessageEvent);

    // Esperar um pouco para as promessas rodarem (inserir Contact, Message, Agent, etc)
    await new Promise((r) => setTimeout(r, 2500));

    // Verificar PostgreSQL
    const contact = await Contact.findOne({ where: { phone_number: '5511999999999', tenant_id: TENANT_ID } });
    expect(contact).not.toBeNull();
    expect(contact.full_name).toBe('Fulano de Tal');

    // Verificar MongoDB
    const msgMongo = await Message.findOne({ external_id: 'TEST_MSG_ID_123', tenant_id: TENANT_ID });
    expect(msgMongo).not.toBeNull();
    expect(msgMongo.content).toBe('Olá, testando o E2E!');
    expect(msgMongo.contact_phone).toBe('5511999999999');
    
    // A IA deve ter tentado responder (se o AgentService não estourar erro)
    // Opcional: testar se a IA gerou uma resposta mockada enviando sendMessage
    // expect(sendMsgMock).toHaveBeenCalled(); // Pode falhar se não houver config de IA ativa
  }, 10000);

  it('4. Deve deletar a sessão', async () => {
    const result = await whatsappService.deleteSession(TENANT_ID, SESSION_NAME);
    expect(result).toBe(true);

    const instance = await WhatsAppInstance.findOne({ where: { tenant_id: TENANT_ID } });
    expect(instance).toBeNull();
    
    // A pasta deve ter sumido
    const sessionDir = path.join(__dirname, '..', 'sessions', `${TENANT_ID}_${SESSION_NAME}`);
    expect(fs.existsSync(sessionDir)).toBe(false);
  });
});
