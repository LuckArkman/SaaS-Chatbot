const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logger = require('../src/utils/logger');
const { Contact, Tag } = require('../src/models/sql/models');

// ── CONFIGURAÇÃO DE MOCKS PARA EVITAR NECESSIDADE DE CONEXÃO AO DB ────────────────
let lastQueryOptions = null;

Contact.findAndCountAll = async (options) => {
  lastQueryOptions = options;
  if (!options || !options.where || !options.where.tenant_id) {
    throw new Error('MISSING_TENANT_ID_IN_QUERY');
  }
  return { count: 1, rows: [{ id: 1, full_name: 'Test', phone_number: '123', tenant_id: options.where.tenant_id }] };
};

Contact.findOne = async (options) => {
  lastQueryOptions = options;
  if (!options || !options.where || !options.where.tenant_id) {
    throw new Error('MISSING_TENANT_ID_IN_QUERY');
  }
  if (options.where.id === 999999) {
    return null; // Simula registro não encontrado ou de outro tenant
  }
  return {
    id: options.where.id,
    phone_number: '123456789',
    tenant_id: options.where.tenant_id,
    update: async (data) => {},
    destroy: async () => {},
    setTags: async (tags) => {}
  };
};

Tag.findAll = async (options) => {
  if (!options || !options.where || !options.where.tenant_id) {
    throw new Error('MISSING_TENANT_ID_IN_TAG_QUERY');
  }
  return [];
};

const contactsController = require('../src/controllers/contactsController');

const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

const runTests = async () => {
  logger.info('🚀 Iniciando testes de validação de isolamento multitenant...');

  try {
    // 1. Testa isolamento no listContacts
    logger.info('Testando isolamento de leitura de contatos (listContacts)...');
    
    const reqA = {
      query: { page: 1, limit: 10, search: 'test' },
      tenantId: 'TENANT_A'
    };
    const resA = mockResponse();
    
    await contactsController.listContacts(reqA, resA);
    if (resA.statusCode && resA.statusCode !== 200) {
      throw new Error(`listContacts falhou com status: ${resA.statusCode}. Dados: ${JSON.stringify(resA.jsonData)}`);
    }

    if (lastQueryOptions.where.tenant_id !== 'TENANT_A') {
      throw new Error(`Erro: listContacts não filtrou pelo tenant correto! Filtro aplicado: ${JSON.stringify(lastQueryOptions.where)}`);
    }
    logger.info('✅ listContacts filtrou com sucesso por TENANT_A.');

    // 2. Testa isolamento no updateContact
    logger.info('Testando isolamento de escrita/atualização de contato (updateContact)...');
    const reqUpdate = {
      params: { id: 999999 }, // Simula ID inexistente ou pertencente a outro tenant
      body: { full_name: 'Hack Name', tag_ids: [] },
      tenantId: 'TENANT_B'
    };
    const resUpdate = mockResponse();
    
    await contactsController.updateContact(reqUpdate, resUpdate);
    if (resUpdate.statusCode !== 404) {
      throw new Error(`Segurança burlada! updateContact retornou ${resUpdate.statusCode} em vez de 404.`);
    }
    if (lastQueryOptions.where.tenant_id !== 'TENANT_B') {
      throw new Error(`Filtro incorreto no update: ${JSON.stringify(lastQueryOptions.where)}`);
    }
    logger.info('✅ updateContact retornou 404 e buscou filtrando por TENANT_B.');

    // 3. Testa isolamento no deleteContact
    logger.info('Testando isolamento de exclusão de contato (deleteContact)...');
    const reqDelete = {
      params: { id: 999999 },
      tenantId: 'TENANT_C'
    };
    const resDelete = mockResponse();
    await contactsController.deleteContact(reqDelete, resDelete);
    if (resDelete.statusCode !== 404) {
      throw new Error(`Segurança burlada! deleteContact retornou ${resDelete.statusCode} em vez de 404.`);
    }
    if (lastQueryOptions.where.tenant_id !== 'TENANT_C') {
      throw new Error(`Filtro incorreto no delete: ${JSON.stringify(lastQueryOptions.where)}`);
    }
    logger.info('✅ deleteContact retornou 404 e buscou filtrando por TENANT_C.');

    // 4. Testes de integridade sintática dos workers
    logger.info('Testando imports e integridade sintática dos workers...');
    const flowWorker = require('../src/workers/flowWorker');
    const campaignWorker = require('../src/workers/campaignWorker');
    const ackWorker = require('../src/workers/ackWorker');
    
    if (!flowWorker || !campaignWorker || !ackWorker) {
      throw new Error('Falha ao importar workers modificados.');
    }
    logger.info('✅ Todos os workers foram importados e validados sintaticamente.');

    logger.info('🎉 Todos os testes de isolamento de tenants PASSARAM com sucesso!');
    process.exit(0);
  } catch (err) {
    logger.error(`❌ Erro nos testes de isolamento: ${err.message}`);
    process.exit(1);
  }
};

runTests();
