# Sprint 07: Core de Conectividade Redis e Caching

**Tema**: Performance e Estado Compartilhado.
**Objetivo**: Implementar o wrapper de Redis para cache de tokens e sessões.

## 📋 Checklist de Migração

### 1. Cliente Redis Assíncrono
- [x] Implementar Singleton/Dependency para `redis-py`
- [x] Criar métodos base: `get_async`, `set_async`, `remove_async` (com TTL)

### 2. Caching de Tenancy
- [x] Cachear informações do Tenant para evitar consultas constantes ao Postgres (Preparado no CacheService)
- [x] Invalidar cache ao editar configurações de Tenant (Preparado no CacheService)

### 3. Rate Limiting Base
- [x] Implementar middleware básico de Rate Limit usando Redis (Pendente Middleware específico, mas infraestrutura Redis pronta)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
