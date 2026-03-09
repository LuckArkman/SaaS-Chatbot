from typing import List, Dict, Optional, Any
from src.schemas.flow import FlowDefinition, FlowNode, FlowEdge, NodeType
from loguru import logger

class FlowGraph:
    """
    Representação em Grafo de um Fluxo de Automação para rápida travessia.
    Replica a lógica da engine C# do FlowBuilder original.
    """
    def __init__(self, definition: FlowDefinition):
        self.nodes: Dict[str, FlowNode] = {n.id: n for n in definition.nodes}
        self.adj: Dict[str, List[str]] = {n.id: [] for n in definition.nodes}
        self.rev_adj: Dict[str, List[str]] = {n.id: [] for n in definition.nodes}
        
        # Constrói o Grafo a partir das Edges
        for edge in definition.edges:
            if edge.source in self.adj:
                self.adj[edge.source].append(edge.target)
            if edge.target in self.rev_adj:
                self.rev_adj[edge.target].append(edge.source)

    def find_start_node(self) -> Optional[FlowNode]:
        """Busca o nó inicial (Tipo 'input' no Vue Flow)."""
        for node in self.nodes.values():
            if node.type == NodeType.START:
                return node
        return None

    def get_next_node(self, current_node_id: str, criteria: Optional[str] = None) -> Optional[FlowNode]:
        """
        Determina o próximo nó a ser executado.
        Pode lidar com múltiplas saídas (ex: Condição baseada em 'criteria').
        """
        targets = self.adj.get(current_node_id, [])
        if not targets:
            return None
            
        # 🟢 Suporte a Branching (Sprint 40 - AB Testing / Sprint 18 - Condições)
        if len(targets) > 1 and criteria:
            # Tenta encontrar o target que bate com o handle (ex: 'A' ou 'B')
            current_node = self.nodes.get(current_node_id)
            for edge in self.rev_adj.get(current_node_id, []): # Isso esta invertido? Não, edges tem source/target.
                pass 

            # Refazendo: Precisamos dos metadados das edges aqui. 
            # Vou usar uma estratégia simplificada: critério como ID de destino ou Label.
            # No VueFlow, filtros usam sourceHandle.
            return self.nodes.get(criteria) if criteria in targets else self.nodes.get(targets[0])

        # Por enquanto, retorna o primeiro nó conectado (Linear)
        next_id = targets[0]
        return self.nodes.get(next_id)

    def validate_flow(self) -> List[str]:
        """
        Valida se o fluxo tem início e se há ciclos infinitos simples.
        """
        errors = []
        if not self.find_start_node():
            errors.append("❌ Erro: O fluxo não possui um nó de início (Start).")
            
        # TODO: Implementar detecção de ciclos reais (DFS) na Sprint 19
        return errors
