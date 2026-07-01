const mongoose = require('mongoose');

const errorReportSchema = new mongoose.Schema({
  error_code: { type: Number, required: true },
  description: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed }, // Payload enviado pelo Frontend no request (se existir)
  route: { type: String, required: true },
  method: { type: String, required: true },
  tenant_id: { type: String, default: null }, // Se aplicável
  timestamp: { type: Date, default: Date.now } // Data, dia e hora (UTC) do erro
});

// Índice para busca rápida de erros recentes ou por código
errorReportSchema.index({ timestamp: -1, error_code: 1 });
errorReportSchema.index({ tenant_id: 1 });

module.exports = mongoose.model('ErrorReport', errorReportSchema);
