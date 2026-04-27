const { User } = require('../models/sql/models');
// const BillingService = require('../services/billingService');

const getTenantStats = async (req, res) => {
  if (!req.user.is_superuser) {
    return res.status(403).json({ detail: 'Acesso negado. Apenas SuperAdmins.' });
  }
  
  try {
    // Retorna estatísticas de todos os tenants
    const usersCount = await User.count({ ignoreTenant: true });
    return res.json({ total_users: usersCount, status: 'healthy' });
  } catch (e) {
    return res.status(500).json({ detail: 'Erro interno' });
  }
};

module.exports = { getTenantStats };
