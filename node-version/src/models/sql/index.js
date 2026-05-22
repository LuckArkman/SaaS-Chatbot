const { sequelize } = require('../../config/database');
const { getCurrentTenantId } = require('../../middlewares/tenancyMiddleware');
const logger = require('../../utils/logger');
const models = require('./models');

/**
 * 🚀 MULTI-TENANT HOOKS (O Segredo do Isolamento Hermético)
 * Substitui o tenant_persistence_hook do Python.
 * Aplica automaticamente o tenant_id a todas as queries (SELECT, INSERT, UPDATE, DELETE)
 * com base na requisição atual, prevenindo vazamentos de dados de forma nativa e invisível aos Services.
 */

// Adiciona os hooks globais na instância do Sequelize
sequelize.addHook('beforeFind', (options) => {
  const tenantId = getCurrentTenantId();
  if (tenantId && !options.ignoreTenant) {
    options.where = options.where || {};
    options.where.tenant_id = tenantId;
  }
});

sequelize.addHook('beforeCreate', (instance, options) => {
  const tenantId = getCurrentTenantId();
  if (tenantId && !instance.tenant_id) {
    instance.tenant_id = tenantId;
  }
});

sequelize.addHook('beforeUpdate', (instance, options) => {
  const tenantId = getCurrentTenantId();
  if (tenantId && options.where) {
    options.where.tenant_id = tenantId;
  }
});

sequelize.addHook('beforeDestroy', (options) => {
  const tenantId = getCurrentTenantId();
  if (tenantId && options.where && !options.ignoreTenant) {
    options.where.tenant_id = tenantId;
  }
});

module.exports = {
  ...models,
  sequelize
};
