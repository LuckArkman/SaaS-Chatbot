const { Flow } = require('../models/nosql/Flow');

const getFlow = async (req, res) => {
  try {
    const flow = await Flow.findOne({ tenant_id: req.tenantId, is_active: true });
    if (!flow) {
      return res.json({ name: 'Default Flow', nodes: [], edges: [], trigger_keywords: [] });
    }
    return res.json(flow);
  } catch (e) {
    return res.status(500).json({ detail: 'Erro ao buscar fluxo' });
  }
};

const saveFlow = async (req, res) => {
  const { name, nodes, edges, trigger_keywords } = req.body;
  try {
    let flow = await Flow.findOne({ tenant_id: req.tenantId, is_active: true });
    
    if (flow) {
      flow.nodes = nodes;
      flow.edges = edges;
      flow.trigger_keywords = trigger_keywords;
      flow.name = name || flow.name;
      flow.updated_at = new Date();
      flow.version += 1;
      await flow.save();
    } else {
      flow = await Flow.create({
        tenant_id: req.tenantId,
        name: name || 'Meu Primeiro Flow',
        nodes,
        edges,
        trigger_keywords: trigger_keywords || [],
        is_active: true
      });
    }

    return res.json({ success: true, version: flow.version });
  } catch (e) {
    return res.status(500).json({ detail: 'Erro ao salvar fluxo' });
  }
};

module.exports = { getFlow, saveFlow };
