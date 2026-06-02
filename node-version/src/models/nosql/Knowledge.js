const mongoose = require('mongoose');

const KnowledgeSchema = new mongoose.Schema({
  tenant_id: { type: String, required: true, index: true },
  content: { type: String, required: true },
  metadata: {
    source: { type: String }, // Nome do arquivo ou URL
    page: { type: Number },
    chunk_index: { type: Number }
  },
  embedding: { type: [Number], index: '2dsphere' }, // Para busca vetorial
  created_at: { type: Date, default: Date.now }
});

// Para busca rápida por tenant
// tenant_id já possui index: true na definição do Schema acima

module.exports = mongoose.model('Knowledge', KnowledgeSchema);
