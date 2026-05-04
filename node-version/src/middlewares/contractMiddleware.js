const phoneUtils = require('../utils/phoneUtils');
const logger = require('../utils/logger');

/**
 * Middleware de Contrato Fechado.
 * Garante que as requisições contenham dados completos e válidos antes de atingir os controllers.
 */
const validatePhoneContract = (req, res, next) => {
  const { phone, phone_number, to, conversation_id } = { ...req.body, ...req.query, ...req.params };
  const rawPhone = phone || phone_number || to || conversation_id;

  if (!rawPhone) {
    return res.status(400).json({ 
      error: 'Contrato Inválido', 
      detail: 'Identificador de telefone ausente.' 
    });
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
