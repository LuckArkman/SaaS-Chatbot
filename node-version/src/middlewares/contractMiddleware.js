const phoneUtils = require('../utils/phoneUtils');
const logger = require('../utils/logger');

/**
 * Middleware de Contrato Fechado.
 * Garante que as requisições contenham dados completos e válidos antes de atingir os controllers.
 */
const validatePhoneContract = (req, res, next) => {
  const { phone, phone_number, to, conversation_id } = { ...req.body, ...req.query, ...req.params };
  const rawPhone = phone || phone_number || to || conversation_id;

  // Log de diagnóstico para identificar qual rota está chamando o contrato
  logger.debug(`[Contrato] Validando rota: ${req.method} ${req.originalUrl} | Phone: ${rawPhone || 'N/A'}`);

  if (!rawPhone) {
    // Se não há telefone na requisição, permitimos que siga. 
    // O Controller dará erro se o campo for obrigatório para a lógica de negócio.
    return next();
  }

  const normalized = phoneUtils.normalizeToDb(rawPhone);

  if (!phoneUtils.isValidDbFormat(normalized)) {
    logger.warn(`[Contrato] Requisição rejeitada: '${rawPhone}' não pôde ser normalizado para 13 dígitos.`);
    return res.status(422).json({ 
      error: 'Contrato Violado', 
      detail: `O número '${rawPhone}' é inválido. O formato esperado é 55 + DDD + Número com 9 dígitos.` 
    });
  }

  // Injeta o número normalizado no request para uso simplificado nos controllers
  req.normalizedPhone = normalized;
  next();
};

module.exports = {
  validatePhoneContract
};
