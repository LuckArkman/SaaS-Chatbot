/**
 * resellerController.js
 *
 * Painel de controle dos Revendedores (White-label).
 * Todas as rotas são protegidas por requireAuth + requireReseller.
 *
 * Hierarquia: SuperAdmin → Reseller → Sub-Tenants (Clientes Finais)
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const {
  User, Reseller, ResellerSubTenant,
  WhatsAppInstance, Plan, Subscription
} = require('../models/sql/models');
const Message = require('../models/nosql/Message');
const security = require('../utils/security');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// GET /api/v1/reseller/me
// Informações e estatísticas do próprio revendedor
// ---------------------------------------------------------------------------
const getResellerMe = async (req, res) => {
  try {
    const reseller = req.reseller;

    const subTenantCount = await ResellerSubTenant.count({
      where: { reseller_id: reseller.id }
    });

    const activeSubTenants = await ResellerSubTenant.count({
      where: { reseller_id: reseller.id, status: 'active' }
    });

    const plan = reseller.plan_id
      ? await Plan.findByPk(reseller.plan_id, { attributes: ['name', 'price', 'max_bots'] })
      : null;

    return res.json({
      id: reseller.id,
      company_name: reseller.company_name,
      brand_name: reseller.brand_name,
      tenant_id: reseller.tenant_id,
      plan: plan || null,
      limits: {
        max_sub_tenants: reseller.max_sub_tenants,
        used_sub_tenants: subTenantCount,
        active_sub_tenants: activeSubTenants,
        available_slots: reseller.max_sub_tenants - subTenantCount,
      },
      commission_pct: reseller.commission_pct,
      contact_email: reseller.contact_email,
      is_active: reseller.is_active,
    });
  } catch (e) {
    logger.error(`[Reseller] getResellerMe erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/reseller/clients
// Lista os sub-tenants (clientes finais) do revendedor
// ---------------------------------------------------------------------------
const listClients = async (req, res) => {
  const { page = 1, limit = 50, search, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = { reseller_id: req.reseller.id };
    if (status) where.status = status;

    const { count, rows: links } = await ResellerSubTenant.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Enriquecer com dados do tenant
    const clients = await Promise.all(links.map(async (link) => {
      const user = await User.findOne({
        where: { tenant_id: link.sub_tenant_id, is_agent: false },
        attributes: ['id', 'email', 'full_name', 'is_active', 'created_at'],
        order: [['id', 'ASC']],
      });

      const waCount = await WhatsAppInstance.count({ where: { tenant_id: link.sub_tenant_id } });
      const waConnected = await WhatsAppInstance.count({
        where: { tenant_id: link.sub_tenant_id, status: 'CONNECTED' }
      });

      const matchesSearch = !search || (
        user?.email?.includes(search.toLowerCase()) ||
        user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        link.sub_tenant_id.includes(search.toUpperCase())
      );

      if (!matchesSearch) return null;

      return {
        sub_tenant_id: link.sub_tenant_id,
        status: link.status,
        created_at: link.created_at,
        suspended_at: link.suspended_at,
        suspended_reason: link.suspended_reason,
        owner: user || null,
        whatsapp: { total: waCount, connected: waConnected },
      };
    }));

    return res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      clients: clients.filter(Boolean),
    });
  } catch (e) {
    logger.error(`[Reseller] listClients erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/reseller/clients
// Cria um novo sub-tenant (cliente final) dentro do portfólio do revendedor
// ---------------------------------------------------------------------------
const createClient = async (req, res) => {
  const { email, password, full_name, plan_id } = req.body;
  const reseller = req.reseller;

  if (!email || !password || !full_name) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      detail: 'Os campos email, password e full_name são obrigatórios.'
    });
  }

  try {
    // Verificar limite de sub-tenants do revendedor
    const usedSlots = await ResellerSubTenant.count({ where: { reseller_id: reseller.id } });
    if (usedSlots >= reseller.max_sub_tenants) {
      return res.status(403).json({
        error: 'RESELLER_LIMIT_REACHED',
        detail: `Você atingiu o limite de ${reseller.max_sub_tenants} clientes do seu plano. Contate o administrador para ampliar.`
      });
    }

    // Verificar se email já existe
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail }, ignoreTenant: true });
    if (existingUser) {
      return res.status(409).json({
        error: 'EMAIL_ALREADY_EXISTS',
        detail: 'Este e-mail já está associado a outra conta na plataforma.'
      });
    }

    // Validar complexidade da senha
    try {
      security.validatePasswordComplexity(password);
    } catch (valErr) {
      return res.status(422).json({ error: 'WEAK_PASSWORD', detail: valErr.message });
    }

    // Gerar novo tenant_id único
    const newTenantId = uuidv4().substring(0, 8).toUpperCase();
    const hashedPassword = await security.getPasswordHash(password);

    // Criar o usuário/tenant do cliente
    const newUser = await User.create({
      email: normalizedEmail,
      hashed_password: hashedPassword,
      full_name,
      tenant_id: newTenantId,
      reseller_id: reseller.id, // Marca de origem do revendedor
      is_active: true,
    }, { ignoreTenant: true });

    // Registrar na tabela de controle hierárquico
    await ResellerSubTenant.create({
      reseller_id: reseller.id,
      sub_tenant_id: newTenantId,
      status: 'active',
      plan_id: plan_id || null,
    });

    logger.info(`🆕 [Reseller:${reseller.company_name}] Novo cliente criado: ${normalizedEmail} | Tenant: ${newTenantId}`);

    return res.status(201).json({
      success: true,
      sub_tenant_id: newTenantId,
      owner_email: newUser.email,
      owner_id: newUser.id,
      created_at: newUser.created_at,
    });

  } catch (e) {
    logger.error(`[Reseller] createClient erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/reseller/clients/:tenant_id/stats
// Estatísticas de uso de um cliente específico
// ---------------------------------------------------------------------------
const getClientStats = async (req, res) => {
  try {
    const subTenantId = req.params.tenant_id;

    const [users, waInstances, waConnected, msgCount] = await Promise.all([
      User.findAll({
        where: { tenant_id: subTenantId },
        attributes: ['id', 'email', 'full_name', 'is_active', 'is_agent'],
      }),
      WhatsAppInstance.count({ where: { tenant_id: subTenantId } }),
      WhatsAppInstance.count({ where: { tenant_id: subTenantId, status: 'CONNECTED' } }),
      Message.countDocuments({ tenant_id: subTenantId }),
    ]);

    return res.json({
      sub_tenant_id: subTenantId,
      link_status: req.subTenantLink.status,
      users: { total: users.length, list: users },
      whatsapp: { total: waInstances, connected: waConnected },
      messages: { total: msgCount },
    });
  } catch (e) {
    logger.error(`[Reseller] getClientStats erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/reseller/clients/:tenant_id/suspend
// Suspende um cliente do portfólio do revendedor
// ---------------------------------------------------------------------------
const suspendClient = async (req, res) => {
  const { reason } = req.body;
  const subTenantId = req.params.tenant_id;

  try {
    // Bloqueia os usuários do tenant
    await User.update(
      { is_active: false },
      { where: { tenant_id: subTenantId }, ignoreTenant: true }
    );

    // Atualiza status na tabela hierárquica
    await req.subTenantLink.update({
      status: 'suspended',
      suspended_at: new Date(),
      suspended_reason: reason || 'Suspenso pelo revendedor.',
    });

    logger.warn(`🔒 [Reseller:${req.reseller.company_name}] Cliente suspenso: ${subTenantId} | Motivo: ${reason}`);

    return res.json({
      success: true,
      sub_tenant_id: subTenantId,
      status: 'suspended',
      reason: reason || 'Suspenso pelo revendedor.',
    });
  } catch (e) {
    logger.error(`[Reseller] suspendClient erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/reseller/clients/:tenant_id/reactivate
// Reativa um cliente suspenso
// ---------------------------------------------------------------------------
const reactivateClient = async (req, res) => {
  const subTenantId = req.params.tenant_id;

  try {
    await User.update(
      { is_active: true },
      { where: { tenant_id: subTenantId }, ignoreTenant: true }
    );

    await req.subTenantLink.update({
      status: 'active',
      suspended_at: null,
      suspended_reason: null,
    });

    logger.info(`🔓 [Reseller:${req.reseller.company_name}] Cliente reativado: ${subTenantId}`);

    return res.json({ success: true, sub_tenant_id: subTenantId, status: 'active' });
  } catch (e) {
    logger.error(`[Reseller] reactivateClient erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

module.exports = {
  getResellerMe,
  listClients,
  createClient,
  getClientStats,
  suspendClient,
  reactivateClient,
};
