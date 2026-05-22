const logger = require('./logger');

/**
 * Mapeador de Sessões para lidar com a rotatividade de chaves.
 * Associa chaves temporárias/rotacionadas à chave original do tenant.
 */
class SessionMapper {
  constructor() {
    this.map = new Map(); // currentSessionName -> originalSessionName
  }

  /**
   * Associa uma nova sessão à sessão original.
   * @param {string} currentKey - A chave atual/nova (ex: tenant_ABC_123)
   * @param {string} originalKey - A chave base (ex: tenant_ABC)
   */
  associate(currentKey, originalKey) {
    if (currentKey === originalKey) return;
    this.map.set(currentKey, originalKey);
    logger.info(`[SessionMapper] Associado: ${currentKey} -> ${originalKey}`);
  }

  /**
   * Resolve a chave original a partir de uma chave possivelmente rotacionada.
   * @param {string} key 
   * @returns {string} A chave original
   */
  resolve(key) {
    return this.map.get(key) || key;
  }

  /**
   * Extrai o Tenant ID de forma robusta, lidando com sufixos.
   * @param {string} sessionName 
   * @returns {string} Tenant ID (ex: FBEAE7DA)
   */
  getTenantId(sessionName) {
    const original = this.resolve(sessionName);
    // Remove o prefixo 'tenant_'
    let tenantPart = original.startsWith('tenant_') ? original.replace('tenant_', '') : original;
    
    // Se ainda houver um underscore (ex: FBEAE7DA_hash), pega a primeira parte
    return tenantPart.split('_')[0].toUpperCase();
  }
}

module.exports = new SessionMapper();
