# Sprint 43: Otimização de Performance e Profiling

**Tema**: Polimento Técnico.
**Objetivo**: Garantir tempos de resposta baixos e escalabilidade na VPS.

## 📋 Checklist de Migração

### 1. Database Indexing Tune
- [ ] Analisar queries lentas (Slow Logs) do Postgres e Mongo no novo ecossistema
- [ ] Adicionar índices compostos para filtros de busca de mensagens

### 2. Gunicorn / Uvicorn Tuning
- [ ] Configurar número ideal de workers para o processador da VPS ZAP1
- [ ] Implementar caching L1 em memória para configurações estáticas frequentes

### 3. Resource Cleanup
- [ ] Garantir que conexões de DB e RabbitMQ sejam fechadas corretamente (evitar vazamento)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
