const { Reseller, ResellerSubTenant } = require('../models/sql/models');
const logger = require('../utils/logger');

/**
 * requireReseller()
 * Middleware que valida que o usuário logado pertence a um tenant
 * que é um Reseller ativo. Injeta `req.reseller` na requisição.
 */
const requireReseller = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', detail: 'Autenticação necessária.' });
    }

    const reseller = await Reseller.findOne({
      where: { tenant_id: tenantId, is_active: true }
    });

    if (!reseller) {
      return res.status(403).json({
        error: 'NOT_A_RESELLER',
        detail: 'Este tenant não possui credenciais de revendedor ativas.'
      });
    }

    req.reseller = reseller;
    next();
  } catch (e) {
    logger.error(`[ResellerMiddleware] Erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/**
 * requireResellerOwnsSubTenant()
 * Middleware de segurança hierárquica: garante que o revendedor
 * autenticado é de fato o dono do sub-tenant especificado em :tenant_id.
 * Deve ser usado APÓS requireAuth + requireReseller.
 */
const requireResellerOwnsSubTenant = async (req, res, next) => {
  try {
    const subTenantId = req.params.tenant_id || req.params.sub_tenant_id;
    if (!subTenantId) {
      return res.status(400).json({ error: 'BAD_REQUEST', detail: 'tenant_id não especificado.' });
    }

    const link = await ResellerSubTenant.findOne({
      where: {
        reseller_id: req.reseller.id,
        sub_tenant_id: subTenantId.toUpperCase()
      }
    });

    if (!link) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        detail: 'Este sub-tenant não pertence ao seu portfólio de clientes.'
      });
    }

    req.subTenantLink = link;
    next();
  } catch (e) {
    logger.error(`[ResellerMiddleware] Erro ao verificar posse do sub-tenant: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: e.message });
  }
};

module.exports = { requireReseller, requireResellerOwnsSubTenant };
