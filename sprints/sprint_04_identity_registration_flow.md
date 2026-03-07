# Sprint 04: API de Registro e Recuperação de Senha

**Tema**: Fluxos de Onboarding e Self-Service de Identidade.
**Objetivo**: Concluir as funcionalidades de borda do Serviço de Identidade.

## 📋 Checklist de Migração

### 1. Registro de Novos Usuários
- [ ] Endpoint `/auth/register` com validação Pydantic
- [ ] Lógica para criação de novo Tenant vinculado ao usuário owner
- [ ] Geração de evento `UserCreatedEvent` para RabbitMQ

### 2. Recuperação de Senha
- [ ] Implementar lógica de geração de Password Reset Token
- [ ] Criar serviço de envio de e-mail (mock ou SMTP temporário)
- [ ] Endpoint para alteração de senha autenticada

### 3. Validação de Domínio
- [ ] Regras de complexidade de senha replicadas do `IdentityOptions` do .NET

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
