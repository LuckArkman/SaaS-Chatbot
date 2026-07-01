const ErrorReport = require('../models/nosql/ErrorReport');
const logger = require('../utils/logger');

/**
 * Middleware Global de Interceptação de Erros
 * Captura exceções não tratadas nas rotas e as envia para o banco de relatórios.
 */
const errorMiddleware = async (err, req, res, next) => {
  // Determina o Status Code (falhas não previstas viram 500 Catastrophic Failure)
  const statusCode = err.status || err.statusCode || 500;
  
  const errorDescription = err.message || 'Falha Catastrófica Interna';
  
  // Coleta dados da falha e da comunicação (payload que o frontend tentou enviar)
  const errorData = {
    error_code: statusCode,
    description: statusCode === 500 ? `${errorDescription} - ${err.stack}` : errorDescription,
    payload: req.body, // O payload recebido pelo Frontend no momento do erro
    route: req.originalUrl,
    method: req.method,
    tenant_id: req.tenantId || 'SYSTEM_UNIDENTIFIED',
    timestamp: new Date() // Data e Hora completas da falha
  };

  try {
    // Armazena de forma persistente para análise posterior
    await ErrorReport.create(errorData);
    logger.error(`[Error Reporting System] Falha registrada no Banco: ${statusCode} na rota ${req.originalUrl}`);
  } catch (dbErr) {
    logger.error(`[Error Reporting System] Falha Crítica ao tentar salvar o relatório de erro no MongoDB: ${dbErr.message}`);
  }

  // Devolve a resposta estruturada para o Frontend (inclui o código e descrição, conforme solicitado)
  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      description: errorDescription,
      timestamp: errorData.timestamp
    }
  });
};

module.exports = errorMiddleware;
