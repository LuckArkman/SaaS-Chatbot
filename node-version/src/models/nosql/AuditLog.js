const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenant_id: { type: String, required: true },
  user_id: { type: String, default: null }, // Opcional (se autenticado)
  method: { type: String, required: true },
  url: { type: String, required: true },
  status_code: { type: Number, required: true },
  response_payload: { type: mongoose.Schema.Types.Mixed }, // Pode ser JSON ou texto
  delivered_at: { type: Date, default: Date.now } // Data e hora da entrega
});

// Adiciona um índice para otimizar buscas por tenant e data
auditLogSchema.index({ tenant_id: 1, delivered_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
