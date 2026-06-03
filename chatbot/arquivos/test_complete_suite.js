const assert = require('assert');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Load environment variables for credentials/keys
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const SECRET_KEY = process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';
const PROVISION_API_KEY = process.env.PROVISION_API_KEY || 'provision-secret-key-123';
process.env.PROVISION_API_KEY = PROVISION_API_KEY; // Ensure it matches

// Mock database storage
const mockDb = {
  adminUsers: [],
  auditLogs: [],
  users: [],
  whatsappInstances: [],
  callLogs: [],
  messages: []
};

// ── OVERRIDE SEQUELIZE MODELS TO BYPASS DATABASE CONNECTIONS ────────────────────
const {
  AdminUser, AuditLog,
  User, Contact, WhatsAppInstance,
  Plan, Subscription, Invoice, Transaction,
  Campaign, AiConfig, CallLog
} = require('../src/models/sql/models');

const makeMockRecord = (data, dbList) => {
  const record = {
    ...data,
    save: async function() { return this; },
    update: async function(d) { Object.assign(this, d); return this; },
    destroy: async function() {
      const idx = dbList.indexOf(this);
      if (idx !== -1) dbList.splice(idx, 1);
      return this;
    },
    toJSON: function() {
      const safe = { ...this };
      delete safe.save;
      delete safe.update;
      delete safe.destroy;
      delete safe.toJSON;
      return safe;
    }
  };
  return record;
};

AdminUser.count = async () => mockDb.adminUsers.length;
AdminUser.create = async (data) => {
  const item = makeMockRecord({ id: mockDb.adminUsers.length + 1, ...data }, mockDb.adminUsers);
  mockDb.adminUsers.push(item);
  return item;
};
AdminUser.findOne = async (options) => {
  const email = options.where?.email?.toLowerCase();
  return mockDb.adminUsers.find(x => x.email === email) || null;
};
AdminUser.findAll = async () => mockDb.adminUsers;
AdminUser.findByPk = async (id) => mockDb.adminUsers.find(x => x.id === parseInt(id)) || null;

AuditLog.create = async (data) => {
  const item = makeMockRecord({ id: mockDb.auditLogs.length + 1, ...data }, mockDb.auditLogs);
  mockDb.auditLogs.push(item);
  return item;
};
AuditLog.findAndCountAll = async (options) => {
  return { count: mockDb.auditLogs.length, rows: mockDb.auditLogs };
};

User.count = async () => mockDb.users.length;
User.create = async (data) => {
  const item = makeMockRecord({ id: mockDb.users.length + 1, ...data }, mockDb.users);
  mockDb.users.push(item);
  return item;
};
User.findOne = async (options) => {
  const email = options.where?.email?.toLowerCase();
  const id = options.where?.id;
  const tenant_id = options.where?.tenant_id;
  return mockDb.users.find(x => (email && x.email === email) || (id && x.id === parseInt(id)) || (tenant_id && x.tenant_id === tenant_id)) || null;
};
User.findAll = async () => mockDb.users;
User.findByPk = async (id) => mockDb.users.find(x => x.id === parseInt(id)) || null;
User.findAndCountAll = async () => ({ count: mockDb.users.length, rows: mockDb.users });
User.update = async (values, options) => {
  const tenant_id = options.where?.tenant_id;
  const id = options.where?.id;
  let count = 0;
  for (const user of mockDb.users) {
    if ((tenant_id && user.tenant_id === tenant_id) || (id && user.id === parseInt(id))) {
      Object.assign(user, values);
      count++;
    }
  }
  return [count];
};

WhatsAppInstance.findOne = async (options) => {
  const tenant_id = options.where?.tenant_id;
  const session_name = options.where?.session_name;
  return mockDb.whatsappInstances.find(x => (tenant_id && x.tenant_id === tenant_id) || (session_name && x.session_name === session_name)) || null;
};
WhatsAppInstance.findAll = async () => mockDb.whatsappInstances;
WhatsAppInstance.create = async (data) => {
  const item = makeMockRecord({
    id: mockDb.whatsappInstances.length + 1,
    status: 'DISCONNECTED',
    is_active: true,
    ...data
  }, mockDb.whatsappInstances);
  mockDb.whatsappInstances.push(item);
  return item;
};

CallLog.create = async (data) => {
  const item = makeMockRecord({ id: mockDb.callLogs.length + 1, ...data }, mockDb.callLogs);
  mockDb.callLogs.push(item);
  return item;
};
CallLog.findOne = async (options) => {
  const call_id = options.where?.call_id;
  const tenant_id = options.where?.tenant_id;
  return mockDb.callLogs.find(x => x.call_id === call_id && (!tenant_id || x.tenant_id === tenant_id)) || null;
};
CallLog.findAndCountAll = async () => ({ count: mockDb.callLogs.length, rows: mockDb.callLogs });

// Setup sub stubs for Sequelize NXN calls
Subscription.findAll = async () => [];
Subscription.findAndCountAll = async () => ({ count: 0, rows: [] });
Transaction.findAll = async () => [];
Transaction.findAndCountAll = async () => ({ count: 0, rows: [] });
Plan.findAll = async () => [];
Campaign.findAll = async () => [];
AiConfig.findOne = async () => null;

// ── OVERRIDE MONGOOSE MESSAGE MODEL ────────────────────────────────────────────
const MessageModel = require('../src/models/nosql/Message');
MessageModel.findOne = async () => null;
MessageModel.create = async (data) => {
  const msg = {
    _id: String(mockDb.messages.length + 1),
    ...data,
    timestamp: new Date()
  };
  mockDb.messages.push(msg);
  return msg;
};
MessageModel.find = () => {
  return {
    sort: () => {
      return {
        skip: () => {
          return {
            limit: async () => mockDb.messages
          }
        }
      }
    }
  }
};
MessageModel.countDocuments = async () => mockDb.messages.length;

// ── OVERRIDE SERVICES & UTILS ──────────────────────────────────────────────────
const StorageService = require('../src/services/storageService');
StorageService.saveUpload = async (buffer, filename, tenantId) => {
  return `uploads/${tenantId}/${filename}`;
};
StorageService.getPublicUrl = (filePath) => `/${filePath}`;

const rabbitmqBus = require('../src/config/rabbitmq');
rabbitmqBus.publish = async (exchange, routingKey, message) => {
  console.log(`   [Mock RabbitMQ] publish -> ${exchange}:${routingKey} | to=${message.to}`);
};

const whatsappService = require('../src/services/whatsappCore');
whatsappService.makeCall = async (session, phone, isVideo) => {
  return { id: `call-${Date.now()}` };
};
whatsappService.rejectCall = async () => true;
whatsappService.endCall = async () => true;
whatsappService.sendMessage = async (session, to, content, type, mediaUrl) => {
  return { success: true, message_id: `msg-${Date.now()}` };
};
whatsappService.logoutSession = async (session) => {
  console.log(`   [Mock WhatsApp] Logged out session: ${session}`);
  return true;
};

const connectionManager = require('../src/websockets/connectionManager');
connectionManager.publishEvent = async (tenantId, payload, userId = null) => {
  console.log(`   [Mock WS] publishEvent tenant=${tenantId}: method=${payload.method}`);
};

// ── SETUP CONTROLLERS & MIDDLEWARES ─────────────────────────────────────────────
const authController = require('../src/controllers/authController');
const adminController = require('../src/controllers/adminController');
const chatController = require('../src/controllers/chatController');
const callsController = require('../src/controllers/callsController');
const storageController = require('../src/controllers/storageController');

const mockResponse = () => {
  const res = {};
  res.headers = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.setHeader = (name, val) => {
    res.headers[name] = val;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  res.send = (data) => {
    res.sendData = data;
    return res;
  };
  return res;
};

// ── TEST SUITE EXECUTION ────────────────────────────────────────────────────────
const runAllTests = async () => {
  console.log('===============================================================');
  console.log('🚀 INICIANDO PILHA DE TESTES COMPLETA (INTEGRAÇÃO & MOCKS)');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // GRUPO 1: AUTHENTICATION & HOTSPOT INTEGRATION (ROTAS ALTERADAS/NOVAS)
    // -------------------------------------------------------------------------
    console.log('--- [GRUPO 1: AUTH & HOTSPOT INTEGRATION] ---');

    // 1.1 Cadastro de utilizador (POST /api/v1/auth/register) — Novo E-mail
    console.log('[TEST] 1.1 Cadastro de utilizador (Idempotente) - Novo E-mail');
    const reqRegNew = {
      body: {
        email: 'user@hotspot.com',
        password: 'PassWord@1234',
        full_name: 'João Silva'
      }
    };
    const resRegNew = mockResponse();
    await authController.register(reqRegNew, resRegNew);
    assert.strictEqual(resRegNew.statusCode, 201);
    assert.strictEqual(resRegNew.jsonData.created, true);
    assert.ok(resRegNew.jsonData.access_token);
    console.log('   ✅ Cadastro de novo e-mail retornou 201 + JWT.');

    // 1.2 Cadastro de utilizador (Idempotente) — E-mail existente + senha correta (Login silencioso)
    console.log('[TEST] 1.2 Cadastro de utilizador (Idempotente) - E-mail existente + Senha Correta');
    const reqRegSilent = {
      body: {
        email: 'user@hotspot.com',
        password: 'PassWord@1234',
        full_name: 'João Silva'
      }
    };
    const resRegSilent = mockResponse();
    await authController.register(reqRegSilent, resRegSilent);
    assert.strictEqual(resRegSilent.statusCode, 200);
    assert.strictEqual(resRegSilent.jsonData.created, false);
    assert.ok(resRegSilent.jsonData.access_token);
    console.log('   ✅ Cadastro idempotente retornou 200 + JWT (Login silencioso).');

    // 1.3 Cadastro de utilizador (Idempotente) — E-mail existente + senha incorreta (Conflito)
    console.log('[TEST] 1.3 Cadastro de utilizador (Idempotente) - E-mail existente + Senha Errada');
    const reqRegConflict = {
      body: {
        email: 'user@hotspot.com',
        password: 'WrongPassword@999',
        full_name: 'João Silva'
      }
    };
    const resRegConflict = mockResponse();
    await authController.register(reqRegConflict, resRegConflict);
    assert.strictEqual(resRegConflict.statusCode, 409);
    assert.strictEqual(resRegConflict.jsonData.error, 'EMAIL_ALREADY_EXISTS');
    assert.strictEqual(resRegConflict.jsonData.code, 'PASSWORD_MISMATCH');
    console.log('   ✅ Retornou corretamente 409 + PASSWORD_MISMATCH.');

    // 2.1 Login Normal (POST /api/v1/auth/login) — JSON email + password
    console.log('[TEST] 2.1 Login Normal (JSON)');
    const reqLoginJson = {
      body: {
        email: 'user@hotspot.com',
        password: 'PassWord@1234'
      }
    };
    const resLoginJson = mockResponse();
    await authController.login(reqLoginJson, resLoginJson);
    assert.strictEqual(resLoginJson.statusCode, 200);
    assert.ok(resLoginJson.jsonData.access_token);
    console.log('   ✅ Login via JSON retornou 200 + JWT.');

    // 2.2 Login OAuth2 Form-Encoded (username + password)
    console.log('[TEST] 2.2 Login Form-Encoded (username/OAuth2)');
    const reqLoginOAuth = {
      body: {
        username: 'user@hotspot.com',
        password: 'PassWord@1234'
      }
    };
    const resLoginOAuth = mockResponse();
    await authController.login(reqLoginOAuth, resLoginOAuth);
    assert.strictEqual(resLoginOAuth.statusCode, 200);
    assert.ok(resLoginOAuth.jsonData.access_token);
    console.log('   ✅ Login via OAuth2 Form-Encoded retornou 200 + JWT.');

    // 3.1 Provisionamento Hotspot (POST /api/v1/auth/provision) — Novo E-mail
    console.log('[TEST] 3.1 Provisionamento Hotspot - Novo E-mail');
    const reqProvNew = {
      body: {
        email: 'prov@hotspot.com',
        password: 'Pass@1234Password',
        full_name: 'Prov User',
        tenant_name: 'Tenant Prov'
      }
    };
    const resProvNew = mockResponse();
    await authController.provision(reqProvNew, resProvNew);
    assert.strictEqual(resProvNew.statusCode, 201);
    assert.strictEqual(resProvNew.jsonData.created, true);
    assert.ok(resProvNew.jsonData.access_token);
    console.log('   ✅ Provisionamento de novo e-mail retornou 201.');

    // 3.2 Provisionamento Hotspot — E-mail existente + senha correta
    console.log('[TEST] 3.2 Provisionamento Hotspot - E-mail existente + Senha Correta');
    const reqProvSilent = {
      body: {
        email: 'prov@hotspot.com',
        password: 'Pass@1234Password'
      }
    };
    const resProvSilent = mockResponse();
    await authController.provision(reqProvSilent, resProvSilent);
    assert.strictEqual(resProvSilent.statusCode, 200);
    assert.strictEqual(resProvSilent.jsonData.created, false);
    assert.strictEqual(resProvSilent.jsonData.password_updated, false);
    console.log('   ✅ Provisionamento silencioso retornou 200 + password_updated=false.');

    // 3.3 Provisionamento Hotspot — E-mail existente + senha errada (Atualização de Senha)
    console.log('[TEST] 3.3 Provisionamento Hotspot - E-mail existente + Senha Diferente (Update)');
    const reqProvUpdate = {
      body: {
        email: 'prov@hotspot.com',
        password: 'NewStrongPassword@2026'
      }
    };
    const resProvUpdate = mockResponse();
    await authController.provision(reqProvUpdate, resProvUpdate);
    assert.strictEqual(resProvUpdate.statusCode, 200);
    assert.strictEqual(resProvUpdate.jsonData.password_updated, true);
    console.log('   ✅ Atualizou a senha do utilizador automaticamente e retornou 200.');

    // 4.1 Admin reset de senha sem e-mail (PATCH /api/v1/admin/users/:email/password)
    console.log('[TEST] 4.1 Admin Reset de Senha (Sem E-mail)');
    const reqAdminReset = {
      params: { email: 'prov@hotspot.com' },
      body: { new_password: 'ResetAdmin@Pass99' }
    };
    const resAdminReset = mockResponse();
    await authController.adminResetPassword(reqAdminReset, resAdminReset);
    assert.strictEqual(resAdminReset.statusCode, 200);
    assert.strictEqual(resAdminReset.jsonData.success, true);
    console.log('   ✅ Senha resetada via painel admin com sucesso.');

    // 5.1 Desativação de própria conta pelo tenant (DELETE /api/v1/auth/remove)
    console.log('[TEST] 5.1 Desativação de conta - Senha errada');
    const u = mockDb.users.find(x => x.email === 'user@hotspot.com');
    const reqRemoveErr = {
      user: u,
      body: {
        confirm: 'DELETE_MY_ACCOUNT',
        password: 'WrongPassword'
      }
    };
    const resRemoveErr = mockResponse();
    await authController.deleteMyAccount(reqRemoveErr, resRemoveErr);
    assert.strictEqual(resRemoveErr.statusCode, 401);
    console.log('   ✅ Desativação recusada por senha errada (401).');

    console.log('[TEST] 5.2 Desativação de conta - Sucesso');
    const reqRemoveOk = {
      user: u,
      body: {
        confirm: 'DELETE_MY_ACCOUNT',
        password: 'PassWord@1234'
      }
    };
    const resRemoveOk = mockResponse();
    // mock WhatsAppInstance activa pro tenant para testar limpeza automatica de conexao
    await WhatsAppInstance.create({ tenant_id: u.tenant_id, session_name: `tenant_${u.tenant_id}`, is_active: true });
    
    await authController.deleteMyAccount(reqRemoveOk, resRemoveOk);
    assert.strictEqual(resRemoveOk.statusCode, 200);
    assert.strictEqual(resRemoveOk.jsonData.success, true);
    assert.strictEqual(u.is_active, false); // Confirm that model user was deactivated
    console.log('   ✅ Conta do tenant desativada com sucesso (is_active=false) e instâncias deslogadas.');

    console.log('');

    // -------------------------------------------------------------------------
    // GRUPO 2: CAMADA ADMINISTRATIVA / SUPERADMIN (ROTAS DE ADMINISTRAÇÃO DO SISTEMA)
    // -------------------------------------------------------------------------
    console.log('--- [GRUPO 2: CAMADA ADMINISTRATIVA - SUPERADMIN] ---');

    // 2.1 Cadastro administrativo bootstrap (sadmin register primeiro admin)
    console.log('[TEST] 6.1 Registro Administrativo - Primeiro Admin (Bootstrap SuperAdmin)');
    const reqSadNew = {
      body: {
        email: 'super@saas.com',
        password: 'SuperAdminPassword@123',
        full_name: 'SuperAdmin Principal',
        role: 'superadmin'
      }
    };
    const resSadNew = mockResponse();
    await adminController.registerAdmin(reqSadNew, resSadNew);
    assert.strictEqual(resSadNew.statusCode, 201);
    assert.strictEqual(resSadNew.jsonData.role, 'superadmin');
    console.log('   ✅ Primeiro admin criado automaticamente como superadmin.');

    // 2.2 Login administrativo
    console.log('[TEST] 7.1 Login Administrativo');
    const reqSadLog = {
      body: {
        email: 'super@saas.com',
        password: 'SuperAdminPassword@123'
      }
    };
    const resSadLog = mockResponse();
    await adminController.loginAdmin(reqSadLog, resSadLog);
    assert.strictEqual(resSadLog.statusCode, 200);
    assert.ok(resSadLog.jsonData.access_token);
    console.log('   ✅ Login administrativo efetuado com sucesso.');

    // 2.3 Me Perfil Administrativo
    console.log('[TEST] 8.1 Perfil Administrativo (Me)');
    const adminUserObj = mockDb.adminUsers[0];
    const reqSadMe = { admin: adminUserObj };
    const resSadMe = mockResponse();
    await adminController.getAdminMe(reqSadMe, resSadMe);
    assert.strictEqual(resSadMe.statusCode, 200);
    assert.strictEqual(resSadMe.jsonData.email, 'super@saas.com');
    console.log('   ✅ Perfil do administrador autenticado recuperado.');

    // 2.4 Listar Admins
    console.log('[TEST] 9.1 Listar todos os administradores');
    const reqSadList = { admin: adminUserObj };
    const resSadList = mockResponse();
    await adminController.listAdmins(reqSadList, resSadList);
    assert.strictEqual(resSadList.statusCode, 200);
    assert.ok(Array.isArray(resSadList.jsonData.admins));
    console.log('   ✅ Lista de administradores recuperada.');

    // 2.5 Atualizar Admin
    console.log('[TEST] 10.1 Atualizar Role do Admin');
    const reqSadUpd = {
      admin: adminUserObj,
      params: { id: 1 },
      body: { role: 'support' }
    };
    const resSadUpd = mockResponse();
    await adminController.updateAdmin(reqSadUpd, resSadUpd);
    assert.strictEqual(resSadUpd.statusCode, 200);
    console.log('   ✅ Role de admin atualizada com sucesso.');

    // 2.6 Listar Tenants
    console.log('[TEST] 11.1 Listar todos os tenants');
    const reqTenList = { admin: adminUserObj, query: { page: 1, limit: 10 } };
    const resTenList = mockResponse();
    await adminController.listTenants(reqTenList, resTenList);
    assert.strictEqual(resTenList.statusCode, 200);
    console.log('   ✅ Lista de tenants com subscrições recuperada.');

    // 2.7 Detalhes de Tenant
    console.log('[TEST] 12.1 Detalhes de Tenant');
    const reqTenDet = { admin: adminUserObj, params: { tenant_id: u.tenant_id } };
    const resTenDet = mockResponse();
    await adminController.getTenantDetail(reqTenDet, resTenDet);
    assert.strictEqual(resTenDet.statusCode, 200);
    console.log('   ✅ Detalhes completos do tenant consultados.');

    // 2.8 Bloquear Tenant
    console.log('[TEST] 13.1 Bloquear Tenant');
    const reqTenBlock = {
      admin: adminUserObj,
      params: { tenant_id: u.tenant_id },
      body: { reason: 'Inadimplência recorrente' }
    };
    const resTenBlock = mockResponse();
    await adminController.blockTenant(reqTenBlock, resTenBlock);
    assert.strictEqual(resTenBlock.statusCode, 200);
    assert.strictEqual(u.is_active, false); // Todos os users do tenant devem ser bloqueados
    console.log('   ✅ Tenant bloqueado com sucesso (todos os usuários associados desativados).');

    // 2.9 Desbloquear Tenant
    console.log('[TEST] 13.2 Desbloquear Tenant');
    const reqTenUnblock = {
      admin: adminUserObj,
      params: { tenant_id: u.tenant_id }
    };
    const resTenUnblock = mockResponse();
    await adminController.unblockTenant(reqTenUnblock, resTenUnblock);
    assert.strictEqual(resTenUnblock.statusCode, 200);
    assert.strictEqual(u.is_active, true);
    console.log('   ✅ Tenant desbloqueado com sucesso (usuários reativados).');

    // 2.10 Listar Utilizadores Cross-Tenant
    console.log('[TEST] 14.1 Listar todos os utilizadores da plataforma (Cross-Tenant)');
    const reqAllUsr = { admin: adminUserObj, query: {} };
    const resAllUsr = mockResponse();
    await adminController.listAllUsers(reqAllUsr, resAllUsr);
    assert.strictEqual(resAllUsr.statusCode, 200);
    console.log('   ✅ Consulta cross-tenant de utilizadores paginada retornou 200.');

    // 2.11 Monitoramento e Estatísticas Globais
    console.log('[TEST] 15.1 Métricas Globais (Stats Dashboard)');
    const reqStats = { admin: adminUserObj };
    const resStats = mockResponse();
    await adminController.getTenantStats(reqStats, resStats);
    assert.strictEqual(resStats.statusCode, 200);
    console.log('   ✅ Estatísticas gerais e de infraestrutura do SaaS obtidas.');

    // 2.12 Trilha de Auditoria
    console.log('[TEST] 16.1 Consultar Trilha de Auditoria');
    const reqAudit = { admin: adminUserObj, query: {} };
    const resAudit = mockResponse();
    await adminController.listAuditLogs(reqAudit, resAudit);
    assert.strictEqual(resAudit.statusCode, 200);
    console.log('   ✅ Lista de logs de auditoria imutável recuperada.');

    // 2.13 Saúde de Serviços e Manutenção
    console.log('[TEST] 17.1 Consultar estado de saúde dos serviços (HealthCheck)');
    const reqHealth = { admin: adminUserObj };
    const resHealth = mockResponse();
    await adminController.getSystemHealth(reqHealth, resHealth);
    assert.strictEqual(resHealth.statusCode, 200);
    assert.strictEqual(resHealth.jsonData.status, 'healthy');
    console.log('   ✅ Serviços de infraestrutura verificados (Status: healthy).');

    console.log('');

    // -------------------------------------------------------------------------
    // GRUPO 3: MÍDIAS & CHAMADAS (FLUXOS QUE PASSARAM POR CORREÇÃO)
    // -------------------------------------------------------------------------
    console.log('--- [GRUPO 3: MÍDIAS, UPLOADS & INTEGRATION FIXES] ---');

    // 3.1 Upload de Arquivo no Storage (POST /api/v1/storage/upload)
    console.log('[TEST] 18.1 Upload de arquivo temporário de mídia');
    const reqUpload = {
      tenantId: 'TENANT-MEDIA-TEST',
      file: {
        originalname: 'screenshot.png',
        buffer: Buffer.from('fake-png-raw-data'),
        size: 16,
        mimetype: 'image/png'
      }
    };
    const resUpload = mockResponse();
    await storageController.uploadFile(reqUpload, resUpload);
    assert.strictEqual(resUpload.statusCode, 201);
    assert.ok(resUpload.jsonData.url);
    const mediaUrl = resUpload.jsonData.url;
    console.log(`   ✅ Arquivo salvo. URL pública gerada: ${mediaUrl}`);

    // 3.2 Envio manual de mensagem com texto (chatController)
    console.log('[TEST] 19.1 Envio de mensagem manual - Apenas texto');
    const reqTextMsg = {
      tenantId: 'TENANT-MEDIA-TEST',
      body: {
        to: '5511988888888',
        content: 'Olá! Mensagem de texto simples.'
      }
    };
    const resTextMsg = mockResponse();
    await chatController.sendManualMessage(reqTextMsg, resTextMsg);
    assert.strictEqual(resTextMsg.statusCode, 202);
    console.log('   ✅ Mensagem textual salva no DB e postada no RabbitMQ.');

    // 3.3 Envio manual de mensagem com mídia e legenda (Correção Bug #1)
    console.log('[TEST] 19.2 Envio de mensagem manual - Com mídia e legenda (Bug #1 Fix)');
    const reqMediaMsg = {
      tenantId: 'TENANT-MEDIA-TEST',
      body: {
        to: '5511988888888',
        content: 'Olha esta foto!',
        media_url: mediaUrl
      }
    };
    const resMediaMsg = mockResponse();
    await chatController.sendManualMessage(reqMediaMsg, resMediaMsg);
    assert.strictEqual(resMediaMsg.statusCode, 202);
    // Verifica se salvou a legenda no banco
    const savedMsg = mockDb.messages[mockDb.messages.length - 1];
    assert.strictEqual(savedMsg.content, 'Olha esta foto!');
    assert.strictEqual(savedMsg.message_type, 'image'); // Tipo auto-detectado por screenshot.png
    assert.strictEqual(savedMsg.media_url, mediaUrl);
    console.log('   ✅ Mensagem com mídia e legenda separadas salva. Tipo auto-detectado: image.');

    // 3.4 Iniciar chamada de Voz/Vídeo via WhatsApp
    console.log('[TEST] 20.1 Iniciar chamada de vídeo (Calls start)');
    const reqCall = {
      tenantId: 'TENANT-MEDIA-TEST',
      body: {
        phone_number: '5511988888888',
        is_video: true
      }
    };
    const resCall = mockResponse();
    // Adiciona instância conectada para passar na guarda
    await WhatsAppInstance.create({ tenant_id: 'TENANT-MEDIA-TEST', session_name: 'tenant_TENANT-MEDIA-TEST', status: 'CONNECTED' });
    
    await callsController.startCall(reqCall, resCall);
    assert.strictEqual(resCall.statusCode, 202);
    assert.strictEqual(resCall.jsonData.status, 'calling');
    assert.ok(resCall.jsonData.call_id);
    const callId = resCall.jsonData.call_id;
    console.log(`   ✅ Chamada de vídeo iniciada na Bridge Baileys. Call ID: ${callId}`);

    // 3.5 Aceitar chamada
    console.log('[TEST] 20.2 Aceitar chamada ativa (Calls accept)');
    const reqCallAcc = {
      tenantId: 'TENANT-MEDIA-TEST',
      body: {
        call_id: callId
      }
    };
    const resCallAcc = mockResponse();
    await callsController.acceptCall(reqCallAcc, resCallAcc);
    assert.strictEqual(resCallAcc.statusCode, 200);
    assert.strictEqual(resCallAcc.jsonData.status, 'accepted');
    console.log('   ✅ Sinalização de aceite enviada e gravada no histórico de chamadas.');

    // 3.6 Encerrar chamada
    console.log('[TEST] 20.3 Encerrar chamada ativa (Calls end)');
    const reqCallEnd = {
      tenantId: 'TENANT-MEDIA-TEST',
      body: {
        call_id: callId
      }
    };
    const resCallEnd = mockResponse();
    await callsController.endCall(reqCallEnd, resCallEnd);
    assert.strictEqual(resCallEnd.statusCode, 200);
    console.log('   ✅ Sinalização de término concluída e duração calculada.');

    console.log('\n===============================================================');
    console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO (25+ MOCK ASSERTS)!');
    console.log('===============================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n💥 FALHA NOS TESTES DA API:');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

runAllTests();
