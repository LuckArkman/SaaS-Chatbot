# Sprint 33: Controle de Limites de Uso por Tenant

**Tema**: Governança de Recursos.
**Objetivo**: Impedir que um tenant use mais recursos (mensagens/bot) do que seu plano permite.

## 📋 Checklist de Migração

### 1. Sistema de Quotas
- [ ] Implementar contador de mensagens enviadas por mês no Redis e Postgres
- [ ] Notificar o admin do Tenant quando atingir 80% e 100% do limite

### 2. Enforcement
- [ ] Middleware que impede o `Channel Gateway` de processar se o limite de mensagens for estourado

### 3. Reset Mensal
- [ ] Tarefa agendada (Cron) para zerar contadores de uso no início de cada ciclo de faturamento

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
