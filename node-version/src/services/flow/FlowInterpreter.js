class FlowGraph {
  constructor(definition) {
    this.nodes = {};
    this.adj = {};
    this.rev_adj = {};

    if (definition && definition.nodes) {
      for (const n of definition.nodes) {
        this.nodes[n.id] = n;
        this.adj[n.id] = [];
        this.rev_adj[n.id] = [];
      }
    }

    if (definition && definition.edges) {
      for (const edge of definition.edges) {
        if (this.adj[edge.source]) {
          this.adj[edge.source].push(edge.target);
        }
        if (this.rev_adj[edge.target]) {
          this.rev_adj[edge.target].push(edge.source);
        }
      }
    }
  }

  findStartNode() {
    for (const id in this.nodes) {
      if (this.nodes[id].type === 'start' || this.nodes[id].type === 'trigger') {
        return this.nodes[id];
      }
    }
    return null;
  }

  getNextNode(currentNodeId, criteria = null) {
    const targets = this.adj[currentNodeId] || [];
    if (targets.length === 0) return null;

    if (targets.length > 1 && criteria) {
      if (targets.includes(criteria)) {
        return this.nodes[criteria];
      }
      return this.nodes[targets[0]];
    }

    return this.nodes[targets[0]];
  }

  validateFlow() {
    const errors = [];
    if (!this.findStartNode()) {
      errors.push("❌ Erro: O fluxo não possui um nó de início (Start).");
    }
    return errors;
  }
}

module.exports = FlowGraph;
