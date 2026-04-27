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

module.exports = { requireAuth };
