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
    type: DataTypes.ENUM('DISCONNECTED', 'CONNECTING', 'QRCODE', 'CONNECTED', 'ERR_SESSION'),
    defaultValue: 'DISCONNECTED'
  },
  webhook_url: { type: DataTypes.STRING(255), allowNull: true },
  external_id: { type: DataTypes.STRING(100), allowNull: true },
  qrcode_base64: { type: DataTypes.TEXT, allowNull: true },
  battery_level: { type: DataTypes.INTEGER, defaultValue: 0 },
  phone_number: { type: DataTypes.STRING(20), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_health_check: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
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

module.exports = { 
  User, Contact, Tag, WhatsAppInstance, 
  Plan, Subscription, Invoice, Transaction, 
  Campaign, CampaignContact, Department 
};
