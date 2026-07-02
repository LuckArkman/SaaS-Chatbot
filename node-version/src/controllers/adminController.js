/**
 * adminController.js
 *
 * Camada administrativa completa do SaaS Chatbot.
 * Todas as rotas deste controller são protegidas por requireSuperAdmin().
 * Cada ação escreve um registo na tabela audit_logs (imutável).
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const {
  AdminUser, AuditLog,
  User, Contact, WhatsAppInstance,
  Plan, Subscription, Invoice, Transaction,
  Campaign, AiConfig, CallLog,
  Reseller, ResellerSubTenant
} = require('../models/sql/models');
const Message = require('../models/nosql/Message');
const logger = require('../utils/logger');

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';

// ---------------------------------------------------------------------------
// Helper: gravar auditoria
// ---------------------------------------------------------------------------
const audit = async (req, action, entity_type, entity_id, details = {}) => {
  try {
    await AuditLog.create({
      admin_id: req.admin?.id || null,
      admin_email: req.admin?.email || 'system',
      admin_role: req.admin?.role || 'system',
      action,
      entity_type,
      entity_id: String(entity_id || ''),
      details,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers['user-agent'],
    });
  } catch (e) {
    logger.error(`[Audit] Falha ao gravar log de auditoria: ${e.message}`);
  }
};

// ---------------------------------------------------------------------------
// 1. AUTH ADMINISTRATIVA
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/sadmin/auth/register
 * Cria um novo AdminUser. Apenas o primeiro admin pode ser criado sem autenticação
 * (bootstrap). Após isso, só um superadmin pode criar novos admins.
 */
const registerAdmin = async (req, res) => {
  const { email, password, full_name, role = 'readonly' } = req.body;

  if (!email || !password || !full_name) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      detail: 'email, password e full_name são obrigatórios.',
    });
  }

  try {
    const adminCount = await AdminUser.count();

    // Se já existem admins, exigir autenticação de superadmin
    if (adminCount > 0) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          detail: 'Já existem administradores cadastrados. Autentique-se como superadmin para criar novos.',
        });
      }
      // O middleware requireSuperAdmin já terá validado — apenas chegamos aqui se OK
    }

    const existing = await AdminUser.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'EMAIL_EXISTS', detail: 'Este e-mail já está registado.' });
    }

    const validRoles = ['superadmin', 'support', 'finance', 'readonly'];
    const finalRole = validRoles.includes(role) ? role : 'readonly';
    const hashed = await bcrypt.hash(password, 12);

    const admin = await AdminUser.create({
      email: email.toLowerCase(),
      full_name,
      hashed_password: hashed,
      role: adminCount === 0 ? 'superadmin' : finalRole, // Primeiro admin = superadmin
      is_active: true,
    });

    await audit(req, 'ADMIN_CREATED', 'admin_user', admin.id, { email: admin.email, role: admin.role });

    const { hashed_password, ...safeAdmin } = admin.toJSON();
    logger.info(`🆕 [Admin] Novo admin criado: ${admin.email} (${admin.role})`);
    return res.status(201).json(safeAdmin);

  } catch (e) {
    logger.error(`[Admin] Erro ao registar admin: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * POST /api/v1/sadmin/auth/login
 * Login administrativo — devolve um JWT com token_type: 'admin'.
 */
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: 'VALIDATION_ERROR', detail: 'email e password são obrigatórios.' });
  }

  try {
    const admin = await AdminUser.findOne({ where: { email: email.toLowerCase() } });

    if (!admin || !(await bcrypt.compare(password, admin.hashed_password))) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', detail: 'E-mail ou senha incorretos.' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ error: 'ADMIN_INACTIVE', detail: 'Conta administrativa desativada.' });
    }

    // Atualizar metadados de acesso
    await admin.update({
      last_login_at: new Date(),
      login_count: (admin.login_count || 0) + 1,
    });

    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, token_type: 'admin' },
      ADMIN_SECRET,
      { expiresIn: '8h' }
    );

    await audit({ admin, ip: req.ip, headers: req.headers }, 'ADMIN_LOGIN', 'admin_user', admin.id, { email: admin.email });

    logger.info(`[Admin] Login: ${admin.email} (${admin.role}) — IP: ${req.ip}`);
    return res.status(200).json({
      access_token: token,
      token_type: 'bearer',
      admin_id: admin.id,
      email: admin.email,
      role: admin.role,
      expires_in: '8h',
    });

  } catch (e) {
    logger.error(`[Admin] Erro no login: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * GET /api/v1/sadmin/auth/me
 */
const getAdminMe = async (req, res) => {
  const { hashed_password, ...safe } = req.admin.toJSON();
  return res.json(safe);
};

// ---------------------------------------------------------------------------
// 2. GESTÃO DE ADMINS
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/sadmin/admins
 * Lista todos os administradores. Apenas superadmin.
 */
const listAdmins = async (req, res) => {
  try {
    const admins = await AdminUser.findAll({
      attributes: { exclude: ['hashed_password'] },
      order: [['created_at', 'DESC']],
    });
    return res.json({ total: admins.length, admins });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * PATCH /api/v1/sadmin/admins/:id
 * Atualiza role ou status de um admin. Apenas superadmin.
 */
const updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { role, is_active } = req.body;

  try {
    const admin = await AdminUser.findByPk(id);
    if (!admin) return res.status(404).json({ error: 'NOT_FOUND', detail: 'Admin não encontrado.' });

    const before = { role: admin.role, is_active: admin.is_active };
    if (role) admin.role = role;
    if (is_active !== undefined) admin.is_active = is_active;
    await admin.save();

    await audit(req, 'ADMIN_UPDATED', 'admin_user', id, { before, after: { role: admin.role, is_active: admin.is_active } });

    const { hashed_password, ...safe } = admin.toJSON();
    return res.json(safe);
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// 3. GESTÃO DE TENANTS
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/sadmin/tenants
 * Lista todos os tenants com seus dados consolidados.
 */
const listTenants = async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = { ignoreTenant: true };
    if (search) where.where = { email: { [Op.iLike]: `%${search}%` } };

    // Agrupa utilizadores por tenant_id
    const { sequelize: db } = require('../config/database');
    const tenants = await db.query(`
      SELECT 
        tenant_id,
        COUNT(*) as user_count,
        MIN(created_at) as created_at,
        BOOL_OR(is_active) as has_active_user
      FROM users
      ${search ? `WHERE email ILIKE '%${search.replace(/'/g, "''")}%'` : ''}
      GROUP BY tenant_id
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `, { type: db.QueryTypes.SELECT });

    // Enriquecer com subscription info
    const enriched = await Promise.all(tenants.map(async (t) => {
      const sub = await Subscription.findOne({
        where: { tenant_id: t.tenant_id },
        include: [{ model: Plan, attributes: ['name', 'price'] }],
      });
      const waSessions = await WhatsAppInstance.count({ where: { tenant_id: t.tenant_id } });
      return {
        ...t,
        plan: sub?.Plan?.name || 'sem_plano',
        plan_price: sub?.Plan?.price || 0,
        subscription_status: sub?.status || 'none',
        wa_sessions: waSessions,
      };
    }));

    return res.json({ page: parseInt(page), limit: parseInt(limit), tenants: enriched });
  } catch (e) {
    logger.error(`[Admin] listTenants erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * GET /api/v1/sadmin/tenants/:tenant_id
 * Detalhes completos de um tenant específico.
 */
const getTenantDetail = async (req, res) => {
  const { tenant_id } = req.params;
  try {
    const users = await User.findAll({
      where: { tenant_id },
      attributes: { exclude: ['hashed_password'] },
    });

    if (!users.length) {
      return res.status(404).json({ error: 'NOT_FOUND', detail: `Tenant ${tenant_id} não encontrado.` });
    }

    const [subscription, waInstances, campaigns, aiConfig, msgCount] = await Promise.all([
      Subscription.findOne({ where: { tenant_id }, include: [Plan] }),
      WhatsAppInstance.findAll({ where: { tenant_id } }),
      Campaign.count({ where: { tenant_id } }),
      AiConfig.findOne({ where: { tenant_id } }),
      Message.countDocuments({ tenant_id }),
    ]);

    return res.json({
      tenant_id,
      users,
      subscription,
      whatsapp_instances: waInstances,
      campaigns_count: campaigns,
      messages_count: msgCount,
      ai_config: aiConfig ? { provider: aiConfig.provider, model: aiConfig.model, is_active: aiConfig.is_active } : null,
    });
  } catch (e) {
    logger.error(`[Admin] getTenantDetail erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * POST /api/v1/sadmin/tenants/:tenant_id/block
 * Bloqueia todos os utilizadores de um tenant.
 */
const blockTenant = async (req, res) => {
  const { tenant_id } = req.params;
  const { reason } = req.body;

  try {
    const [updated] = await User.update(
      { is_active: false },
      { where: { tenant_id }, ignoreTenant: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'NOT_FOUND', detail: `Nenhum utilizador encontrado para o tenant ${tenant_id}.` });
    }

    await audit(req, 'TENANT_BLOCKED', 'tenant', tenant_id, { reason: reason || 'Sem motivo especificado', users_blocked: updated });

    logger.warn(`🔒 [Admin] Tenant bloqueado: ${tenant_id} | Motivo: ${reason} | Por: ${req.admin.email}`);
    return res.json({ success: true, tenant_id, users_blocked: updated, reason });

  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * POST /api/v1/sadmin/tenants/:tenant_id/unblock
 * Desbloqueia todos os utilizadores de um tenant.
 */
const unblockTenant = async (req, res) => {
  const { tenant_id } = req.params;

  try {
    const [updated] = await User.update(
      { is_active: true },
      { where: { tenant_id }, ignoreTenant: true }
    );

    await audit(req, 'TENANT_UNBLOCKED', 'tenant', tenant_id, { users_unblocked: updated });

    logger.info(`🔓 [Admin] Tenant desbloqueado: ${tenant_id} | Por: ${req.admin.email}`);
    return res.json({ success: true, tenant_id, users_unblocked: updated });

  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * DELETE /api/v1/sadmin/tenants/:tenant_id
 * Remove completamente um tenant e todos os seus dados. Ação irreversível.
 * Apenas superadmin. Requer header X-Confirm-Delete: DELETE_TENANT_CONFIRMED
 */
const deleteTenant = async (req, res) => {
  const { tenant_id } = req.params;
  const confirmHeader = req.headers['x-confirm-delete'];

  if (confirmHeader !== 'DELETE_TENANT_CONFIRMED') {
    return res.status(400).json({
      error: 'CONFIRMATION_REQUIRED',
      detail: 'Envie o header X-Confirm-Delete: DELETE_TENANT_CONFIRMED para confirmar.',
    });
  }

  try {
    // Remove em sequência para respeitar FKs
    await User.destroy({ where: { tenant_id }, ignoreTenant: true });
    await WhatsAppInstance.destroy({ where: { tenant_id } });
    await Campaign.destroy({ where: { tenant_id } });
    await AiConfig.destroy({ where: { tenant_id } });
    await Subscription.destroy({ where: { tenant_id } });
    await Message.deleteMany({ tenant_id });

    await audit(req, 'TENANT_DELETED', 'tenant', tenant_id, { deleted_by: req.admin.email });

    logger.warn(`🗑️  [Admin] Tenant eliminado: ${tenant_id} | Por: ${req.admin.email}`);
    return res.json({ success: true, tenant_id, message: 'Tenant e todos os seus dados foram removidos.' });

  } catch (e) {
    logger.error(`[Admin] deleteTenant erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// 4. GESTÃO DE UTILIZADORES (cross-tenant)
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/sadmin/users
 * Lista todos os utilizadores de todos os tenants.
 */
const listAllUsers = async (req, res) => {
  const { page = 1, limit = 50, search, tenant_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};
    if (tenant_id) where.tenant_id = tenant_id;
    if (search) where.email = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['hashed_password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      ignoreTenant: true,
    });

    return res.json({ total: count, page: parseInt(page), limit: parseInt(limit), users: rows });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * PATCH /api/v1/sadmin/users/:id/status
 * Ativar ou desativar um utilizador específico.
 */
const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(422).json({ error: 'VALIDATION_ERROR', detail: 'Parâmetro is_active é obrigatório.' });
  }

  try {
    const user = await User.findByPk(id, { ignoreTenant: true });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', detail: 'Utilizador não encontrado.' });

    await user.update({ is_active });
    await audit(req, is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'user', id, { email: user.email, tenant_id: user.tenant_id });

    return res.json({ success: true, id: user.id, email: user.email, is_active: user.is_active });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// 5. MONITORAMENTO E ESTATÍSTICAS
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/sadmin/stats
 * Dashboard global da plataforma.
 */
const getTenantStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTenants,
      totalMessages,
      totalCampaigns,
      totalWaInstances,
      connectedWaInstances,
      activeSubscriptions,
    ] = await Promise.all([
      User.count({ ignoreTenant: true }),
      User.count({ where: { is_active: true }, ignoreTenant: true }),
      User.count({ col: 'tenant_id', distinct: true, ignoreTenant: true }),
      Message.countDocuments({}),
      Campaign.count({ ignoreTenant: true }),
      WhatsAppInstance.count({ ignoreTenant: true }),
      WhatsAppInstance.count({ where: { status: 'CONNECTED' }, ignoreTenant: true }),
      Subscription.count({ where: { status: 'active' } }),
    ]);

    return res.json({
      platform: {
        total_tenants: totalTenants,
        total_users: totalUsers,
        active_users: activeUsers,
        total_messages: totalMessages,
      },
      whatsapp: {
        total_instances: totalWaInstances,
        connected: connectedWaInstances,
        disconnected: totalWaInstances - connectedWaInstances,
      },
      operations: {
        total_campaigns: totalCampaigns,
        active_subscriptions: activeSubscriptions,
      },
    });
  } catch (e) {
    logger.error(`[Admin] stats erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * GET /api/v1/sadmin/tenants/summary
 * Resumo financeiro e operacional por tenant (visão global).
 */
const getTenantsSummary = async (req, res) => {
  try {
    const subs = await Subscription.findAll({
      include: [{ model: Plan, attributes: ['name', 'price'] }],
      order: [['started_at', 'DESC']],
    });

    return res.json({ total: subs.length, subscriptions: subs });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * GET /api/v1/sadmin/transactions
 * Todas as transações financeiras da plataforma.
 */
const listTransactions = async (req, res) => {
  const { page = 1, limit = 50, tenant_id, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};
    if (tenant_id) where.tenant_id = tenant_id;
    if (status) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({ total: count, page: parseInt(page), transactions: rows });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// 6. HISTÓRICO DE CONVERSAS (cross-tenant)
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/sadmin/conversations
 * Visualiza conversas de qualquer tenant para auditoria.
 */
const listConversations = async (req, res) => {
  const { tenant_id, contact_phone, limit = 50, page = 1 } = req.query;

  try {
    const filter = {};
    if (tenant_id) filter.tenant_id = tenant_id;
    if (contact_phone) filter.contact_phone = contact_phone;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    await audit(req, 'CONVERSATION_VIEWED', 'conversation', tenant_id || 'all', { contact_phone, page });

    return res.json({ total, page: parseInt(page), limit: parseInt(limit), messages });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// 7. AUDITORIA
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/sadmin/audit-logs
 * Histórico de todas as ações administrativas.
 */
const listAuditLogs = async (req, res) => {
  const { page = 1, limit = 100, action, admin_id, entity_type, from, to } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (admin_id) where.admin_id = admin_id;
    if (entity_type) where.entity_type = entity_type;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({ total: count, page: parseInt(page), limit: parseInt(limit), logs: rows });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// 8. SISTEMA
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/sadmin/system/maintenance
 * Ativa/desativa modo de manutenção da plataforma.
 */
const toggleMaintenance = async (req, res) => {
  const { enabled, message } = req.body;
  // Em produção isto gravaria num Redis/Config global
  process.env.MAINTENANCE_MODE = enabled ? '1' : '0';
  process.env.MAINTENANCE_MESSAGE = message || 'Sistema em manutenção. Volte em breve.';

  await audit(req, enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED', 'system', 'global', { message });

  logger.warn(`⚠️  [Admin] Modo de manutenção: ${enabled ? 'ATIVO' : 'INATIVO'} | Por: ${req.admin.email}`);
  return res.json({ success: true, maintenance: enabled, message: process.env.MAINTENANCE_MESSAGE });
};

/**
 * GET /api/v1/sadmin/system/health
 * Estado de saúde dos serviços da plataforma.
 */
const getSystemHealth = async (req, res) => {
  const health = { status: 'healthy', services: {}, checked_at: new Date() };

  try {
    await User.findOne({ ignoreTenant: true });
    health.services.postgres = 'ok';
  } catch (e) {
    health.services.postgres = 'error';
    health.status = 'degraded';
  }

  try {
    await Message.findOne();
    health.services.mongodb = 'ok';
  } catch (e) {
    health.services.mongodb = 'error';
    health.status = 'degraded';
  }

  try {
    const redis = require('../config/redis');
    await redis.ping();
    health.services.redis = 'ok';
  } catch (e) {
    health.services.redis = 'error';
  }

  health.services.maintenance_mode = process.env.MAINTENANCE_MODE === '1';

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return res.status(statusCode).json(health);
};

/**
 * GET /api/v1/sadmin/system/ws-connections
 * Conexões WebSocket ativas na plataforma.
 */
const inspectWsConnections = async (req, res) => {
  try {
    const connectionManager = require('../websockets/connectionManager');
    const info = connectionManager.getConnectionsInfo ? connectionManager.getConnectionsInfo() : { total: 0 };
    return res.json(info);
  } catch (e) {
    return res.json({ total: 0, error: e.message });
  }
};

/**
 * GET /api/v1/sadmin/system/call-logs
 * Logs de chamadas (sinalizações) de todos os tenants.
 */
const listCallLogs = async (req, res) => {
  const { tenant_id, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};
    if (tenant_id) where.tenant_id = tenant_id;

    const { count, rows } = await CallLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({ total: count, page: parseInt(page), call_logs: rows });
  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// 9. GESTÃO DE REVENDEDORES (Nested Multitenancy)
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/sadmin/resellers
 * Lista todos os revendedores da plataforma.
 */
const listResellers = async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};
    if (search) {
      where[Op.or] = [
        { company_name: { [Op.iLike]: `%${search}%` } },
        { tenant_id: { [Op.iLike]: `%${search}%` } },
        { contact_email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Reseller.findAndCountAll({
      where,
      include: [{ model: Plan, as: 'plan', attributes: ['name', 'price'], required: false }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Enriquecer com contagem de sub-tenants
    const enriched = await Promise.all(rows.map(async (r) => {
      const subCount = await ResellerSubTenant.count({ where: { reseller_id: r.id } });
      return { ...r.toJSON(), sub_tenants_count: subCount };
    }));

    return res.json({ total: count, page: parseInt(page), limit: parseInt(limit), resellers: enriched });
  } catch (e) {
    logger.error(`[Admin] listResellers erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * POST /api/v1/sadmin/resellers
 * Aprova e registra um tenant existente como revendedor.
 */
const createReseller = async (req, res) => {
  const { tenant_id, company_name, max_sub_tenants = 10, plan_id, commission_pct = 0, contact_email, contact_phone, brand_name, brand_logo_url, notes } = req.body;

  if (!tenant_id || !company_name) {
    return res.status(422).json({ error: 'VALIDATION_ERROR', detail: 'tenant_id e company_name são obrigatórios.' });
  }

  try {
    // Verificar se o tenant existe
    const tenantUser = await User.findOne({ where: { tenant_id: tenant_id.toUpperCase() }, ignoreTenant: true });
    if (!tenantUser) {
      return res.status(404).json({ error: 'TENANT_NOT_FOUND', detail: `O tenant ${tenant_id} não existe na plataforma.` });
    }

    // Verificar se já é revendedor
    const existing = await Reseller.findOne({ where: { tenant_id: tenant_id.toUpperCase() } });
    if (existing) {
      return res.status(409).json({ error: 'ALREADY_RESELLER', detail: 'Este tenant já é um revendedor registado.' });
    }

    const reseller = await Reseller.create({
      tenant_id: tenant_id.toUpperCase(),
      company_name,
      max_sub_tenants,
      plan_id: plan_id || null,
      commission_pct,
      contact_email: contact_email || tenantUser.email,
      contact_phone,
      brand_name,
      brand_logo_url,
      notes,
      is_active: true,
    });

    await audit(req, 'RESELLER_CREATED', 'reseller', reseller.id, { tenant_id, company_name, max_sub_tenants });

    logger.info(`🏪 [Admin] Novo revendedor criado: ${company_name} | Tenant: ${tenant_id}`);
    return res.status(201).json(reseller);

  } catch (e) {
    logger.error(`[Admin] createReseller erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * PATCH /api/v1/sadmin/resellers/:id
 * Atualiza configurações de um revendedor (plano, limite, branding, status).
 */
const updateReseller = async (req, res) => {
  const { id } = req.params;
  const { max_sub_tenants, plan_id, is_active, commission_pct, brand_name, brand_logo_url, notes, company_name } = req.body;

  try {
    const reseller = await Reseller.findByPk(id);
    if (!reseller) return res.status(404).json({ error: 'NOT_FOUND', detail: 'Revendedor não encontrado.' });

    const before = reseller.toJSON();

    if (max_sub_tenants !== undefined) reseller.max_sub_tenants = max_sub_tenants;
    if (plan_id !== undefined) reseller.plan_id = plan_id;
    if (is_active !== undefined) reseller.is_active = is_active;
    if (commission_pct !== undefined) reseller.commission_pct = commission_pct;
    if (brand_name !== undefined) reseller.brand_name = brand_name;
    if (brand_logo_url !== undefined) reseller.brand_logo_url = brand_logo_url;
    if (notes !== undefined) reseller.notes = notes;
    if (company_name !== undefined) reseller.company_name = company_name;

    await reseller.save();

    await audit(req, 'RESELLER_UPDATED', 'reseller', id, { before, after: reseller.toJSON() });

    logger.info(`[Admin] Revendedor atualizado: ${reseller.company_name} (ID: ${id}) | Por: ${req.admin.email}`);
    return res.json(reseller);

  } catch (e) {
    logger.error(`[Admin] updateReseller erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
module.exports = {
  // Auth
  registerAdmin,
  loginAdmin,
  getAdminMe,
  // Gestão de Admins
  listAdmins,
  updateAdmin,
  // Gestão de Tenants
  listTenants,
  getTenantDetail,
  blockTenant,
  unblockTenant,
  deleteTenant,
  // Gestão de Utilizadores
  listAllUsers,
  updateUserStatus,
  // Monitoramento
  getTenantStats,
  getTenantsSummary,
  listTransactions,
  // Conversas (auditoria)
  listConversations,
  // Auditoria
  listAuditLogs,
  // Sistema
  toggleMaintenance,
  getSystemHealth,
  inspectWsConnections,
  listCallLogs,
  // Revendedores
  listResellers,
  createReseller,
  updateReseller,
};
