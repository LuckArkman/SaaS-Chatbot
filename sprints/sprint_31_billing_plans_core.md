# Sprint 31: Core de Precificação e Planos

**Tema**: Monetização.
**Objetivo**: Implementar a lógica de planos e assinaturas que sustentará o modelo SaaS.

## 📋 Checklist de Migração

### 1. Modelagem Financeira
- [x] Criar tabelas `Plans` e `Subscriptions` no Postgres (Modelagem src/models/billing.py completa)
- [x] Definir recursos (features) de cada plano (Campos 'max_bots', 'max_agents', etc integrados)

### 2. Controle de Assinatura
- [x] Implementar verificação de validade de plano no Middleware de Tenancy (Gatekeeper BillingMiddleware em src/core/middlewares.py)
- [x] Bloquear acesso a recursos se a assinatura estiver expirada (Retorno de 402 Payment Required funcional)

### 3. API de Planos
- [x] Endpoint de listagem de planos públicos (GET /billing/plans disponível para Onboarding)
- [x] Atribuição automática de plano 'Trial' no registro do usuário

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
