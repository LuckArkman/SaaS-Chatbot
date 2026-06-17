

const { sequelize } = require('../src/config/database');
const mongoose = require('mongoose');
const { WhatsAppInstance, Contact } = require('../src/models/sql/models');
const Message = require('../src/models/nosql/Message');
const whatsappService = require('../src/services/whatsappCore');
const { getWbot, removeWbot } = require('../src/libs/wbot');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const TENANT_ID = 'tenant_test_e2e';
const SESSION_NAME = `tenant_${TENANT_ID}`;

async function runTests() {
  console.log('--- Iniciando Testes E2E Baileys ---');
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://saas_chatbot:3702959@localhost:27017/SaaS_Chatbot?authSource=admin');
    }
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    // Limpeza prévia
    await WhatsAppInstance.destroy({ where: { tenant_id: TENANT_ID } });
    await Contact.destroy({ where: { tenant_id: TENANT_ID } });
    await Message.deleteMany({ tenant_id: TENANT_ID });
    
    const sessionDir = path.join(__dirname, '..', 'sessions', `${TENANT_ID}_${SESSION_NAME}`);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    console.log('[1/4] Testando inicialização da sessão...');
    const initResult = await whatsappService.initializeSession(TENANT_ID, SESSION_NAME);
    if (!initResult.success) throw new Error('Falha ao iniciar sessão');
    
    let instance = await WhatsAppInstance.findOne({ where: { tenant_id: TENANT_ID } });
    if (!instance || !['CONNECTING', 'QRCODE'].includes(instance.status)) {
      throw new Error(`Status no banco incorreto: ${instance?.status}`);
    }
    console.log('✔ Sessão iniciada. Status:', instance.status);

    console.log('[2/4] Testando obtenção do Wbot...');
    const wsocket = getWbot(instance.id);
    if (!wsocket || typeof wsocket.sendMessage !== 'function') throw new Error('wbot inválido');
    console.log('✔ Wbot carregado com sucesso.');

    console.log('[3/4] Testando injeção de mensagem no Listener...');
    // Mockar sendMessage
    let mockCalled = false;
    wsocket.sendMessage = async () => { mockCalled = true; return { key: { id: 'bot_msg_123' }}; };

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

    wsocket.ev.emit('messages.upsert', fakeMessageEvent);

    // Esperar um pouco para inserir no banco
    await new Promise((r) => setTimeout(r, 2000));

    const contact = await Contact.findOne({ where: { phone_number: '5511999999999', tenant_id: TENANT_ID } });
    if (!contact || contact.full_name !== 'Fulano de Tal') throw new Error('Contato não foi salvo ou com nome incorreto');

    const msgMongo = await Message.findOne({ external_id: 'TEST_MSG_ID_123', tenant_id: TENANT_ID });
    if (!msgMongo || msgMongo.content !== 'Olá, testando o E2E!') throw new Error('Mensagem não salva corretamente no MongoDB');
    console.log('✔ Mensagens e contatos processados corretamente no DB.');

    console.log('[4/4] Testando deleção da sessão...');
    const delResult = await whatsappService.deleteSession(TENANT_ID, SESSION_NAME);
    if (!delResult) throw new Error('Falha ao deletar sessão');
    
    instance = await WhatsAppInstance.findOne({ where: { tenant_id: TENANT_ID } });
    if (instance) throw new Error('Instância ainda existe no DB');
    if (fs.existsSync(sessionDir)) throw new Error('Pasta não foi apagada');
    console.log('✔ Sessão deletada com sucesso.');

    console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO! 🎉');

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
  } finally {
    // Limpeza final
    await removeWbot(TENANT_ID);
    await WhatsAppInstance.destroy({ where: { tenant_id: TENANT_ID } });
    await Contact.destroy({ where: { tenant_id: TENANT_ID } });
    await Message.deleteMany({ tenant_id: TENANT_ID });
    
    const sessionDir = path.join(__dirname, '..', 'sessions', `${TENANT_ID}_${SESSION_NAME}`);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    await sequelize.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
