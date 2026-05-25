const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logger = require('../src/utils/logger');
const { testPostgres, connectMongo, sequelize } = require('../src/config/database');

const runTests = async () => {
  logger.info('🚀 Iniciando testes de validação local de Mídias e Chamadas...');

  try {
    // 1. Testa imports do banco
    logger.info('Testing SQL models import...');
    const { CallLog, WhatsAppInstance } = require('../src/models/sql/models');
    if (!CallLog) throw new Error('CallLog model not exported correctly!');
    logger.info('✅ CallLog importado com sucesso.');

    logger.info('Testing NoSQL Message model import...');
    const Message = require('../src/models/nosql/Message');
    const msgInstance = new Message({
      tenant_id: 'TEST_TENANT',
      session_name: 'test_session',
      contact_phone: '5511992161497',
      content: 'Teste de mídia',
      message_type: 'image',
      media_url: '/uploads/TEST_TENANT/photo.jpg'
    });
    if (msgInstance.media_url !== '/uploads/TEST_TENANT/photo.jpg') {
      throw new Error('media_url não foi mapeado corretamente no Schema!');
    }
    logger.info('✅ Schema Message do MongoDB validado com sucesso.');

    // 2. Testa import do StorageService
    logger.info('Testing StorageService...');
    const StorageService = require('../src/services/storageService');
    const testBuffer = Buffer.from('mock file data');
    const testPath = await StorageService.saveUpload(testBuffer, 'test.txt', 'TEST_TENANT');
    const testUrl = StorageService.getPublicUrl(testPath);
    logger.info(`✅ StorageService funcionando. Link público: ${testUrl}`);

    // 3. Testa handlers de chamadas
    logger.info('Testing whatsappCore call signaling helper functions...');
    const whatsappCore = require('../src/services/whatsappCore');
    if (typeof whatsappCore.makeCall !== 'function' || typeof whatsappCore.rejectCall !== 'function') {
      throw new Error('whatsappCore não exportou makeCall ou rejectCall!');
    }
    logger.info('✅ whatsappCore exporta assinaturas de chamadas corretamente.');

    logger.info('Testing mime type lookup helper...');
    const pdfMime = whatsappCore.getMimeType('test.pdf');
    if (pdfMime !== 'application/pdf') {
      throw new Error(`getMimeType retornou incorretamente: ${pdfMime}`);
    }
    logger.info('✅ getMimeType resolveu pdf para application/pdf.');

    logger.info('🎉 Todos os testes de validação sintática e de importação PASSARAM!');
    process.exit(0);

  } catch (err) {
    logger.error(`❌ Falha na validação das implementações: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
};

runTests();
