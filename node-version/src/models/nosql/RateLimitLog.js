const mongoose = require('mongoose');

const rateLimitLogSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true
  },
  email_attempt: {
    type: String,
    required: false
  },
  endpoint: {
    type: String,
    required: true
  },
  user_agent: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 86400 * 30 // Exclui logs automaticamente após 30 dias
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

module.exports = mongoose.model('RateLimitLog', rateLimitLogSchema);
