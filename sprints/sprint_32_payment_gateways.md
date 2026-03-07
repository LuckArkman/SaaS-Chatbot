# Sprint 32: Integração com Gateway de Pagamento (Webhooks)

**Tema**: Fintech/Pagamentos.
**Objetivo**: Processar pagamentos reais (Mercado Pago/Asaas/Stripe) via Python.

## 📋 Checklist de Migração

### 1. Receptor de Webhooks de Pagamento
- [ ] Implementar endpoint seguro para receber notificações de `PAGAMENTO_APROVADO`
- [ ] Validar IP/Signatário do Gateway para segurança

### 2. Fluxo de Ativação
- [ ] Ao receber confirmação de pagamento, atualizar status da assinatura do Tenant
- [ ] Gerar log de transação histórico para o usuário

### 3. Integração de Checkout
- [ ] Endpoints para gerar link de pagamento ou QR Code Pix dinâmico

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
