const mongoose = require('mongoose');

// Schemas embutidos
const flowNodeSchema = new mongoose.Schema({
  id: String,
  type: String,
  data: mongoose.Schema.Types.Mixed,
  position: { x: Number, y: Number }
}, { _id: false });

const flowEdgeSchema = new mongoose.Schema({
  id: String,
  source: String,
  target: String,
  type: String,
  label: String
}, { _id: false });

const flowSchema = new mongoose.Schema({
  tenant_id: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, default: null },
  
  nodes: [flowNodeSchema],
  edges: [flowEdgeSchema],
  
  trigger_keywords: { type: [String], default: [] },
  is_active: { type: Boolean, default: true },
  
  updated_at: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
}, { collection: 'flows' });

flowSchema.index({ tenant_id: 1, name: 1 });
flowSchema.index({ tenant_id: 1, is_active: 1 });

const Flow = mongoose.model('Flow', flowSchema);

const sessionStateSchema = new mongoose.Schema({
  tenant_id: { type: String, required: true, index: true },
  contact_phone: { type: String, required: true, index: true },
  flow_id: { type: String, required: true, index: true },
  current_node_id: { type: String, required: true },
  
  variables: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  last_interaction: { type: Date, default: Date.now },
  is_completed: { type: Boolean, default: false },
  is_human_support: { type: Boolean, default: false }
}, { collection: 'flow_sessions' });

const SessionState = mongoose.model('SessionState', sessionStateSchema);

module.exports = { Flow, SessionState };
