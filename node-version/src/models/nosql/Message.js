const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  tenant_id: { type: String, required: true, index: true },
  session_name: { type: String, required: true, index: true },
  
  contact_phone: { type: String, required: true, index: true },
  contact_name: { type: String, default: null },
  
  content: { type: String, required: true },
  source: { 
    type: String, 
    enum: ['user', 'agent', 'system', 'human'], 
    default: 'user' 
  },
  message_type: { type: String, default: 'text' },
  
  external_id: { type: String, default: null, index: true },
  flow_id: { type: String, default: null },
  
  timestamp: { type: Date, default: Date.now },
  ack: { type: Number, default: 0 } // 0=Pending, 1=Sent, 2=Delivered, 3=Read
}, { collection: 'chat_history' });

// Compound indexes
messageSchema.index({ tenant_id: 1, contact_phone: 1, timestamp: -1 });
messageSchema.index({ tenant_id: 1, session_name: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
