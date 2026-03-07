# Sprint 19: Execução Assíncrona de Nodes e Callbacks

**Tema**: Execução de Fluxo.
**Objetivo**: Garantir que o bot seja capaz de chamar APIs externas e esperar retornos sem travar o Event Loop.

## 📋 Checklist de Migração

### 1. HTTP Client Assíncrono (`httpx`)
- [x] Implementar nó de `ApiCallNode` para integrações de terceiros (Implementado em src/services/node_actions.py via httpx)
- [x] Tratar timeouts e retentativas (Polly-like behavior pronto no executor)

### 2. Event Hooks internais
- [x] Disparar eventos de conclusão de nó de volta no RabbitMQ (Mensagens expedidas via 'message.outgoing')

### 3. Queue Handling
- [x] Garantir que um usuário não dispare múltiplas instâncias (Carga via RabbitMQ Queue FIFO garante ordem por usuário)
- [x] Worker da FlowEngine ativo em segundo plano (FlowWorker rodando na inicialização)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
