const AuditLog = require('../models/nosql/AuditLog');
const logger = require('../utils/logger');

const auditMiddleware = (req, res, next) => {
  // Guardamos a referência original dos métodos de envio de resposta
  const originalSend = res.send;
  const originalJson = res.json;

  // Variável para armazenar o payload interceptado
  let capturedPayload = null;
  const deliveredAt = new Date(); // Data e hora exata da entrega (quando a requisição começou a ser respondida)

  // Monkey-patch do res.json
  res.json = function (body) {
    capturedPayload = body;
    // Restaura e chama o original (para evitar loops)
    res.json = originalJson;
    res.send = originalSend;
    return res.json(body);
  };

  // Monkey-patch do res.send (útil se o controller não usar res.json)
  res.send = function (body) {
    if (!capturedPayload) {
      try {
        capturedPayload = JSON.parse(body);
      } catch (e) {
        capturedPayload = body;
      }
    }
    res.json = originalJson;
    res.send = originalSend;
    return res.send(body);
  };

  // Escuta o término da requisição para salvar no MongoDB de forma não-bloqueante
  res.on('finish', () => {
    // Apenas salva logs se houver tenant_id (rotas da API autenticadas/identificadas)
    // Se quiser gravar TUDO, pode remover o `req.tenantId` (colocando 'SYSTEM' como fallback)
    const tenantId = req.tenantId || 'SYSTEM_UNIDENTIFIED';
    
    // Evita gravar logs de Health Check ou rotas puramente estáticas/docs
    if (req.originalUrl.includes('/health') || req.originalUrl.includes('/docs')) {
      return;
    }

    // Dispara a gravação de forma assíncrona
    AuditLog.create({
      tenant_id: tenantId,
      user_id: req.user ? req.user.id : null,
      method: req.method,
      url: req.originalUrl,
      status_code: res.statusCode,
      response_payload: capturedPayload,
      delivered_at: deliveredAt
    }).catch(err => {
      logger.error(`[AuditMiddleware] Falha ao salvar log de auditoria: ${err.message}`);
    });
  });

  next();
};

module.exports = auditMiddleware;
