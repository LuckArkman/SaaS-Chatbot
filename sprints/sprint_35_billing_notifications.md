# Sprint 35: Notificações de Vencimento e Renovação

**Tema**: Retenção e CRM.
**Objetivo**: Enviar lembretes proativos de pagamento aos clientes.

## 📋 Checklist de Migração

### 1. Scheduler de Alertas
- [x] Scheduler implementado em src/main.py (start_billing_monitoring)
- [x] Detecção proativa de vencimentos (3 dias antes) com logs de alerta (BillingNotificationService)

### 2. Fluxo de Suspensão
- [x] Lógica de suspensão automática (Status 'past_due') para planos expirados
- [x] Bloqueio de acesso via TenancyMiddleware integrado ao status da assinatura

### 3. E-mail de Transacional
- [x] Geração automática de novas faturas ao expirar para incentivar renovação

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
