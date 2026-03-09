# Sprint 16: Migração da Lógica de Parsing de Nós do FlowBuilder

**Tema**: Inteligência de Execução.
**Objetivo**: Reimplementar o interpretador de JSON dos fluxos que vêm do Frontend.

## 📋 Checklist de Migração

### 1. Estrutura de Grafos
- [x] Implementar representação interna de Grafos (Nodes e Edges) (Implementado em src/services/flow_interpreter.py)
- [x] Criar parsers para cada tipo de nó: `TextNode`, `QuestionNode` (Mapeados via NodeType em src/schemas/flow.py)

### 2. Validação de Nó
- [x] Validar conexões órfãs ou ciclos infinitos nos fluxos do usuário (Método 'validate_flow' pronto)

### 3. Mapeamento de Payload
- [x] Garantir que o JSON gerado no Vue.js seja lido sem perdas pela nova lógica em Python (Pydantic v2 schemas ativos)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
