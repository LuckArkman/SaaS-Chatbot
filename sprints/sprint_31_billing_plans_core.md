# Sprint 31: Core de Precificação e Planos

**Tema**: Monetização.
**Objetivo**: Implementar a lógica de planos e assinaturas que sustentará o modelo SaaS.

## 📋 Checklist de Migração

### 1. Modelagem Financeira
- [ ] Criar tabelas `Plans` e `Subscriptions` no Postgres
- [ ] Definir recursos (features) de cada plano: ex: `max_bots`, `max_agents`, `is_campaign_enabled`

### 2. Controle de Assinatura
- [ ] Implementar verificação de validade de plano no Middleware de Tenancy
- [ ] Bloquear acesso a recursos se a assinatura estiver expirada (Grace period)

### 3. API de Planos
- [ ] Endpoint de listagem de planos públicos para Upgrade/Downgrade

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
