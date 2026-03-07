# Sprint 16: Migração da Lógica de Parsing de Nós do FlowBuilder

**Tema**: Inteligência de Execução.
**Objetivo**: Reimplementar o interpretador de JSON dos fluxos que vêm do Frontend.

## 📋 Checklist de Migração

### 1. Estrutura de Grafos
- [ ] Implementar representação interna de Grafos (Nodes e Edges)
- [ ] Criar parsers para cada tipo de nó: `TextNode`, `QuestionNode`, `ConditionalNode`

### 2. Validação de Nó
- [ ] Validar conexões órfãs ou ciclos infinitos nos fluxos do usuário

### 3. Mapeamento de Payload
- [ ] Garantir que o JSON gerado no Vue.js seja lido sem perdas pela nova lógica em Python

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
