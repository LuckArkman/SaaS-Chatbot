# Sprint 03: Implementação do Gerenciamento de Tenancy em Python

**Tema**: Isolamento de Dados e Multi-tenancy (SaaS).
**Objetivo**: Garantir que as requisições identifiquem corretamente o locatário (Tenant) e isolem as queries.

## 📋 Checklist de Migração

### 1. Middleware de Tenancy
- [x] Criar middleware para extrair `TenantId` do Header ou Claims do JWT
- [x] Implementar validação de existência e status do Tenant no banco
- [x] Criar contexto global (`ContextVar`) para armazenar o `TenantId` por requisição

### 2. Isolamento de Queries (SQLAlchemy)
- [x] Configurar Base Model para incluir `tenant_id` em todas as entidades compartilhadas
- [x] Implementar filtragem automática de queries (similar ao Global Query Filters do EF Core)

### 3. Hooks de Persistência
- [x] Garantir que o `tenant_id` seja injetado automaticamente no `save/update`

## 🔑 Conceitos Teóricos
Assim como no C#, o isolamento será a nível de aplicação, onde cada query SQL incluirá o `WHERE tenant_id = :current_tenant_id`.

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
