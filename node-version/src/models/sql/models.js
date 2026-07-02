const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  full_name: { type: DataTypes.STRING },
  hashed_password: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_superuser: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  // Tenancy
  tenant_id: { type: DataTypes.STRING, allowNull: false },

  // Nested Multitenancy: se preenchido, este tenant foi criado por um revendedor
  reseller_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  
  // Agentes
  is_agent: { type: DataTypes.BOOLEAN, defaultValue: false },
  max_concurrent_chats: { type: DataTypes.INTEGER, defaultValue: 5 },
  current_chats_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Contact = sequelize.define('Contact', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  phone_number: { type: DataTypes.STRING(50), allowNull: false },
  full_name: { type: DataTypes.STRING(200), allowNull: true },
  is_blacklisted: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_campaign_id: { type: DataTypes.INTEGER, allowNull: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false },
  // Foto de perfil do WhatsApp (URL temporária fornecida pelo Baileys)
  profile_pic_url: { type: DataTypes.TEXT, allowNull: true },
  // Indica se este contato é um grupo do WhatsApp
  is_group: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'contacts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['phone_number'] },
    { fields: ['tenant_id'] }
  ]
});

const Tag = sequelize.define('Tag', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  color: { type: DataTypes.STRING(20), defaultValue: '#007bff' },
  tenant_id: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'tags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Relacionamento NxN (Contact <-> Tag)
Contact.belongsToMany(Tag, { through: 'contact_tags_assoc', foreignKey: 'contact_id' });
Tag.belongsToMany(Contact, { through: 'contact_tags_assoc', foreignKey: 'tag_id' });

const WhatsAppInstance = sequelize.define('WhatsAppInstance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_name: { type: DataTypes.STRING(100), unique: true },
  status: { 
    type: DataTypes.STRING, // Substituto para ENUM para evitar erro de cast no alter: true
    defaultValue: 'DISCONNECTED'
  },
  webhook_url: { type: DataTypes.STRING(255), allowNull: true },
  external_id: { type: DataTypes.STRING(100), allowNull: true },
  qrcode_base64: { type: DataTypes.TEXT, allowNull: true },
  battery_level: { type: DataTypes.INTEGER, defaultValue: 0 },
  phone_number: { type: DataTypes.STRING(20), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_health_check: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  // Foto de perfil do número conectado (buscada do WhatsApp via Baileys)
  profile_pic_url: { type: DataTypes.TEXT, allowNull: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'whatsapp_instances',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  price: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  currency: { type: DataTypes.STRING(10), defaultValue: 'BRL' },
  max_bots: { type: DataTypes.INTEGER, defaultValue: 1 },
  max_agents: { type: DataTypes.INTEGER, defaultValue: 2 },
  max_messages_month: { type: DataTypes.INTEGER, defaultValue: 1000 },
  is_campaign_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_api_access_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'plans', timestamps: true, createdAt: 'created_at', updatedAt: false });

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  plan_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'active' },
  started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  last_billing_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  next_billing_date: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'subscriptions', timestamps: false });

Plan.hasMany(Subscription, { foreignKey: 'plan_id' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id' });

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_number: { type: DataTypes.STRING(50), unique: true },
  period_start: { type: DataTypes.DATE },
  period_end: { type: DataTypes.DATE },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'open' },
  plan_name: { type: DataTypes.STRING(100) },
  pdf_url: { type: DataTypes.STRING(255), allowNull: true },
  paid_at: { type: DataTypes.DATE, allowNull: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'invoices', timestamps: true, createdAt: 'created_at', updatedAt: false });

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  external_id: { type: DataTypes.STRING(100), unique: true },
  provider: { type: DataTypes.STRING(50) },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'BRL' },
  status: { type: DataTypes.STRING(50) },
  payment_method: { type: DataTypes.STRING(50) },
  details: { type: DataTypes.TEXT, allowNull: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'transactions', timestamps: true, createdAt: 'created_at', updatedAt: false });

const Campaign = sequelize.define('Campaign', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  message_template: { type: DataTypes.TEXT, allowNull: false },
  media_url: { type: DataTypes.STRING(255), allowNull: true },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'draft' },
  total_contacts: { type: DataTypes.INTEGER, defaultValue: 0 },
  sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  read_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  replied_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  error_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  min_delay: { type: DataTypes.INTEGER, defaultValue: 5 },
  max_delay: { type: DataTypes.INTEGER, defaultValue: 15 },
  sleep_start: { type: DataTypes.INTEGER, defaultValue: 22 },
  sleep_end: { type: DataTypes.INTEGER, defaultValue: 8 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'campaigns', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const CampaignContact = sequelize.define('CampaignContact', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campaign_id: { type: DataTypes.INTEGER, allowNull: false },
  phone_number: { type: DataTypes.STRING(50), allowNull: false },
  contact_name: { type: DataTypes.STRING(200), allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  error_message: { type: DataTypes.TEXT, allowNull: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'campaign_contacts', timestamps: false });

Campaign.hasMany(CampaignContact, { foreignKey: 'campaign_id' });
CampaignContact.belongsTo(Campaign, { foreignKey: 'campaign_id' });

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'departments', timestamps: false });

User.belongsToMany(Department, { through: 'agent_department', foreignKey: 'user_id' });
Department.belongsToMany(User, { through: 'agent_department', foreignKey: 'department_id' });

const AiConfig = sequelize.define('AiConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.STRING, unique: true, allowNull: false },
  provider: { type: DataTypes.STRING(50), defaultValue: 'llama' }, // llama, gemini, openai, anthropic, local
  model: { type: DataTypes.STRING(100), defaultValue: 'llama3.2' },
  api_key: { type: DataTypes.STRING(255), allowNull: true },
  system_prompt: { type: DataTypes.TEXT, allowNull: true },
  temperature: { type: DataTypes.FLOAT, defaultValue: 0.7 },
  max_tokens: { type: DataTypes.INTEGER, defaultValue: 1024 },
  is_rag_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'ai_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const CallLog = sequelize.define('CallLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.STRING, allowNull: false },
  contact_phone: { type: DataTypes.STRING, allowNull: false },
  call_id: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'voice' },
  direction: { type: DataTypes.STRING, defaultValue: 'incoming' },
  status: { type: DataTypes.STRING, defaultValue: 'ringing' },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'call_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// ---------------------------------------------------------------------------
// ADMIN LAYER MODELS
// ---------------------------------------------------------------------------

/**
 * AdminUser — Superadministradores da plataforma SaaS.
 * Separado da tabela `users` (tenants) para isolamento total de privilégios.
 */
const AdminUser = sequelize.define('AdminUser', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  full_name: { type: DataTypes.STRING, allowNull: false },
  hashed_password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.STRING,
    defaultValue: 'readonly'
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login_at: { type: DataTypes.DATE, allowNull: true },
  login_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'admin_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * AuditLog — Registo imutável de todas as ações administrativas.
 * Nunca deve ser deletado — serve como trilha de auditoria.
 */
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  // Quem fez a ação
  admin_id: { type: DataTypes.INTEGER, allowNull: true },        // null = ação de sistema
  admin_email: { type: DataTypes.STRING, allowNull: true },
  admin_role: { type: DataTypes.STRING, allowNull: true },
  // O que foi feito
  action: { type: DataTypes.STRING(100), allowNull: false },     // ex: 'TENANT_BLOCKED'
  entity_type: { type: DataTypes.STRING(50), allowNull: true },  // ex: 'tenant', 'user'
  entity_id: { type: DataTypes.STRING(100), allowNull: true },   // ex: tenant_id ou user_id
  // Contexto adicional (payload antes/depois)
  details: { type: DataTypes.JSONB, allowNull: true },
  // Metadados de rede
  ip_address: { type: DataTypes.STRING(50), allowNull: true },
  user_agent: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false  // Imutável — sem updates
});

// Associações de auditoria
AdminUser.hasMany(AuditLog, { foreignKey: 'admin_id' });
AuditLog.belongsTo(AdminUser, { foreignKey: 'admin_id' });

// ---------------------------------------------------------------------------
// NESTED MULTITENANCY — RESELLER LAYER
// ---------------------------------------------------------------------------

/**
 * Reseller — Revendedor aprovado pela plataforma SaaS.
 * Possui um tenant_id próprio (conta deles na plataforma) e pode
 * criar e gerenciar sub-tenants (clientes finais) dentro do seu limite.
 */
const Reseller = sequelize.define('Reseller', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // O tenant_id do próprio revendedor (conta dele na plataforma)
  tenant_id: { type: DataTypes.STRING(50), unique: true, allowNull: false },

  company_name: { type: DataTypes.STRING(200), allowNull: false },

  // Plano que o revendedor contratou com o SaaS Owner
  plan_id: { type: DataTypes.INTEGER, allowNull: true },

  // Limite de sub-tenants (clientes finais) que o revendedor pode criar
  max_sub_tenants: { type: DataTypes.INTEGER, defaultValue: 10 },

  // Markup/Comissão do revendedor (em %, para cálculo de billing)
  commission_pct: { type: DataTypes.FLOAT, defaultValue: 0.0 },

  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

  // Dados de contato do revendedor
  contact_email: { type: DataTypes.STRING(200), allowNull: true },
  contact_phone: { type: DataTypes.STRING(50), allowNull: true },

  // Branding white-label opcional
  brand_name: { type: DataTypes.STRING(100), allowNull: true },
  brand_logo_url: { type: DataTypes.STRING(255), allowNull: true },

  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'resellers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * ResellerSubTenant — Mapeia quais sub-tenants (clientes finais) pertencem a cada revendedor.
 * Tabela de controle e auditoria da hierarquia.
 */
const ResellerSubTenant = sequelize.define('ResellerSubTenant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // FK para o revendedor
  reseller_id: { type: DataTypes.INTEGER, allowNull: false },

  // tenant_id do cliente final que o revendedor criou
  sub_tenant_id: { type: DataTypes.STRING(50), allowNull: false },

  // Status da conta do sub-tenant perante o revendedor
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },

  // Plano individual que o revendedor atribuiu a este cliente
  plan_id: { type: DataTypes.INTEGER, allowNull: true },

  suspended_at: { type: DataTypes.DATE, allowNull: true },
  suspended_reason: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'reseller_sub_tenants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['reseller_id', 'sub_tenant_id'] },
    { fields: ['sub_tenant_id'] }
  ]
});

// Associações
Reseller.hasMany(ResellerSubTenant, { foreignKey: 'reseller_id', as: 'sub_tenants' });
ResellerSubTenant.belongsTo(Reseller, { foreignKey: 'reseller_id', as: 'reseller' });
Reseller.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

module.exports = { 
  User, Contact, Tag, WhatsAppInstance, 
  Plan, Subscription, Invoice, Transaction, 
  Campaign, CampaignContact, Department,
  AiConfig, CallLog,
  AdminUser, AuditLog,
  Reseller, ResellerSubTenant
};
