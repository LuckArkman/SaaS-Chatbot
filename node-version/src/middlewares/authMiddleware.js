const jwt = require('jsonwebtoken');
const { User } = require('../models/sql/models');
const { tenancyContext } = require('./tenancyMiddleware');
const logger = require('../utils/logger');

const SECRET_KEY = process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';

/**
 * Equivalente a `deps.get_current_active_user` e `get_current_tenant_id` no FastAPI.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const userId = payload.sub;
    const tenantId = payload.tenant_id;

    if (!userId || !tenantId) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    // Injeta o TenantId na AsyncLocalStorage (Para os Queries subsequentes)
    // Isso é vital para que os Controladores achem apenas os dados do Tenant.
    tenancyContext.run({ tenantId: tenantId.toUpperCase() }, async () => {
      try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ detail: 'User not found' });
        if (!user.is_active) return res.status(400).json({ detail: 'Inactive user' });

        req.user = user;
        req.tenantId = tenantId.toUpperCase();
        next();
      } catch (dbErr) {
        logger.error(`Erro ao validar DB na auth: ${dbErr.message}`);
        return res.status(500).json({ detail: 'Internal server error' });
      }
    });

  } catch (err) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
};

/**
 * Middleware para endpoints de serviço (provision, admin reset).
 * Valida o header X-Service-Key contra process.env.PROVISION_API_KEY.
 * Não requer JWT de utilizador — é um canal exclusivo para sistemas integrados.
 */
const requireServiceKey = (req, res, next) => {
  const PROVISION_API_KEY = process.env.PROVISION_API_KEY;

  if (!PROVISION_API_KEY) {
    logger.error('[ServiceKey] PROVISION_API_KEY não está definida no ambiente.');
    return res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      detail: 'Endpoint de provisionamento não está configurado neste servidor.',
    });
  }

  const receivedKey = req.headers['x-service-key'];

  if (!receivedKey || receivedKey !== PROVISION_API_KEY) {
    return res.status(401).json({
      error: 'INVALID_SERVICE_KEY',
      detail: 'X-Service-Key inválida ou ausente.',
    });
  }

  next();
};

/**
 * requireSuperAdmin — Middleware exclusivo para rotas do painel administrativo.
 * Valida um JWT de AdminUser (emitido pelo /api/v1/sadmin/auth/login).
 * Suporta controlo de acesso por role: superadmin > support > finance > readonly.
 *
 * Uso: requireSuperAdmin()                  → qualquer admin autenticado
 *      requireSuperAdmin('superadmin')       → apenas superadmin
 *      requireSuperAdmin(['superadmin','finance']) → superadmin ou finance
 */
const requireSuperAdmin = (allowedRoles = null) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', detail: 'Token administrativo ausente.' });
  }

  const token = authHeader.split(' ')[1];
  const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';

  try {
    const payload = jwt.verify(token, ADMIN_SECRET);

    if (payload.token_type !== 'admin') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        detail: 'Este token não tem privilégios administrativos.',
      });
    }

    const { AdminUser } = require('../models/sql/models');
    const admin = await AdminUser.findByPk(payload.sub);

    if (!admin || !admin.is_active) {
      return res.status(403).json({ error: 'ADMIN_INACTIVE', detail: 'Conta administrativa inativa ou não encontrada.' });
    }

    // Verificação de role, se especificada
    if (allowedRoles) {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!roles.includes(admin.role)) {
        return res.status(403).json({
          error: 'INSUFFICIENT_ROLE',
          detail: `Acção requer role: ${roles.join(' ou ')}. Seu role: ${admin.role}.`,
        });
      }
    }

    req.admin = admin;
    next();

  } catch (err) {
    return res.status(401).json({ error: 'INVALID_ADMIN_TOKEN', detail: 'Token administrativo inválido ou expirado.' });
  }
};

module.exports = { requireAuth, requireServiceKey, requireSuperAdmin };
