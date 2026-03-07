# Sprint 19: Execução Assíncrona de Nodes e Callbacks

**Tema**: Execução de Fluxo.
**Objetivo**: Garantir que o bot seja capaz de chamar APIs externas e esperar retornos sem travar o Event Loop.

## 📋 Checklist de Migração

### 1. HTTP Client Assíncrono (`httpx`)
- [ ] Implementar nó de `ApiCallNode` para integrações de terceiros
- [ ] Tratar timeouts e retentativas (Polly-like behavior in Python)

### 2. Event Hooks internais
- [ ] Disparar eventos de conclusão de nó de volta no RabbitMQ para logging/estatística

### 3. Queue Handling
- [ ] Garantir que um usuário não dispare múltiplas instâncias de fluxo simultaneamente (Trava de Concorrência por User)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
