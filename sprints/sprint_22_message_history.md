# Sprint 22: Histórico de Mensagens e Persistência de Conversas

**Tema**: Dados Históricos.
**Objetivo**: Armazenar todas as interações no Postgres para consulta futura e auditoria.

## 📋 Checklist de Migração

### 1. Modelagem SQLAlchemy
- [ ] Criar tabelas `Convos` (Conversas) e `Messages` (Mensagens)
- [ ] Configurar relacionamentos 1:N com `Tenant` e `User`

### 2. Lazy Loading & Paginação
- [ ] Implementar endpoint de `/chats/{id}/messages` com suporte a cursor pagination
- [ ] Otimizar busca de mensagens comuns via índices de `created_at`

### 3. Migração de dados
- [ ] Mapear conversas legadas do sistema .NET para o novo esquema (se necessário)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
