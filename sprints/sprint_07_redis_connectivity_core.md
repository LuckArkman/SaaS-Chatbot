# Sprint 07: Core de Conectividade Redis e Caching

**Tema**: Performance e Estado Compartilhado.
**Objetivo**: Implementar o wrapper de Redis para cache de tokens e sessões.

## 📋 Checklist de Migração

### 1. Cliente Redis Assíncrono
- [ ] ImplementarSingleton/Dependency para `redis-py`
- [ ] Criar métodos base: `get_async`, `set_async`, `remove_async` (com TTL)

### 2. Caching de Tenancy
- [ ] Cachear informações do Tenant para evitar consultas constantes ao Postgres
- [ ] Invalidar cache ao editar configurações de Tenant

### 3. Rate Limiting Base
- [ ] Implementar middleware básico de Rate Limit usando Redis (similar ao AspNetCoreRateLimit)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
