const { AsyncLocalStorage } = require('async_hooks');

/**
 * Substitui o ContextVar do Python.
 * Permite injetar o Tenant ID globalmente no escopo assíncrono da requisição,
 * sem precisar passar a variável de função em função.
 */
const tenancyContext = new AsyncLocalStorage();

/**
 * Middleware que intercepta todas as requisições HTTP, 
 * extrai o X-Tenant-ID do cabeçalho e isola a execução no Event Loop.
 */
const tenancyMiddleware = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenant_id;
  
  // Em vez de rejeitar diretamente aqui (algumas rotas como Webhooks não mandam via header, mas no corpo),
  // nós criamos o store. O controle estrito deve ser feito nas rotas da API.
  const store = {
    tenantId: tenantId ? String(tenantId).toUpperCase() : null
  };

  tenancyContext.run(store, () => {
    next();
  });
};

/**
 * Helper para recuperar o Tenant ID atual em qualquer camada do sistema
 * (ex: dentro dos Models do Sequelize para aplicar escopo automático).
 */
const getCurrentTenantId = () => {
  const store = tenancyContext.getStore();
  return store ? store.tenantId : null;
};

module.exports = {
  tenancyContext,
  tenancyMiddleware,
  getCurrentTenantId
};
