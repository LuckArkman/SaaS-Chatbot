# Sprint 34: Geração de Faturas e Dashboards Financeiros

**Tema**: Reporting Financeiro.
**Objetivo**: Exibir transparência de gastos e faturas para os clientes no UI.

## 📋 Checklist de Migração

### 1. Invoicing System
- [x] Geração de faturamento mensal simples (Modelo 'Invoice' em src/models/invoice.py pronto)
- [x] Lógica de geração de fatura Draft (Implementado em InvoicingService.generate_monthly_invoice)

### 2. Dashboard do Usuário
- [x] Endpoints para visão operacional: Gastos totais, Plano Atual e Faturas (GET /billing/dashboard disponível)

### 3. Integração de Dados
- [x] Vinculação de faturas com transações reais de pagamento integradas via PaymentService

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
