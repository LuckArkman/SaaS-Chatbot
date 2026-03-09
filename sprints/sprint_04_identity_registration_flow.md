# Sprint 04: API de Registro e Recuperação de Senha

**Tema**: Fluxos de Onboarding e Self-Service de Identidade.
**Objetivo**: Concluir as funcionalidades de borda do Serviço de Identidade.

## 📋 Checklist de Migração

### 1. Registro de Novos Usuários
- [x] Endpoint `/auth/register` com validação Pydantic
- [x] Lógica para criação de novo Tenant vinculado ao usuário owner
- [x] Geração de evento `UserCreatedEvent` para RabbitMQ (Log implementado, driver pendente Sprint 08)

### 2. Recuperação de Senha
- [x] Implementar lógica de geração de Password Reset Token
- [x] Criar serviço de envio de e-mail (mock ou SMTP temporário via Logger)
- [x] Endpoint para alteração de senha autenticada

### 3. Validação de Domínio
- [x] Regras de complexidade de senha replicadas do `IdentityOptions` do .NET

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
