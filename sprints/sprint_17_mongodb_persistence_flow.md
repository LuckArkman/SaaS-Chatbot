# Sprint 17: Persistência de Fluxos no MongoDB (Python Beanie)

**Tema**: Bancos Não-Relacionais.
**Objetivo**: Migrar de `SaaS.OmniChannelPlatform.Services.FlowEngine` (C#) para Python usando Beanie.

## 📋 Checklist de Migração

### 1. Conexão MongoDB
- [ ] Configurar models `Flow`, `FlowExecution` e `SessionState` no Beanie
- [ ] Implementar índices por `tenant_id` e `flow_id`

### 2. CRUD de Fluxos
- [ ] Criar repositórios de leitura e escrita de fluxos persistentes
- [ ] Suportar histórico de versões do mesmo fluxo

### 3. Migração de Dados Existentes
- [ ] (Opcional) Script de exportação do Mongo atual para o novo formato em Python (se mudado)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
