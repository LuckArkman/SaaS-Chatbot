# Sprint 33: Controle de Limites de Uso por Tenant

**Tema**: Governança de Recursos.
**Objetivo**: Impedir que um tenant use mais recursos (mensagens/bot) do que seu plano permite.

## 📋 Checklist de Migração

### 1. Sistema de Quotas
- [x] Contador de mensagens por mês implementado em Redis (Alta performance com QuotaService)
- [x] Contagem de instâncias de Bot e Agentes baseadas no Plano (SQLAlchemy)

### 2. Enforcement
- [x] Middleware/Interceptor no Gateway bloqueia mensagens se a quota estourar (src/api/v1/endpoints/gateway.py)
- [x] Bloqueio de criação de bots excedentes no BotManager e API (src/api/v1/endpoints/bot.py)

### 3. Reset Mensal
- [x] Implementação via chaves temporais no Redis (Zera automaticamente por mês/ano)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
