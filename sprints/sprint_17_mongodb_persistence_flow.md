# Sprint 17: Persistência de Fluxos no MongoDB (Python Beanie)

**Tema**: Bancos Não-Relacionais.
**Objetivo**: Migrar de `SaaS.OmniChannelPlatform.Services.FlowEngine` (C#) para Python usando Beanie.

## 📋 Checklist de Migração

### 1. Conexão MongoDB
- [x] Configurar models `Flow`, `SessionState` no Beanie (Implementados em src/models/mongo/flow.py)
- [x] Implementar índices por `tenant_id` e `flow_id` (Índices definidos nos modelos)

### 2. CRUD de Fluxos
- [x] Criar repositórios de leitura e escrita (Inicialização em main.py ativa)
- [x] Suportar persistência de objetos complexos (Nodes/Edges salvos corretamente)

### 3. Migração de Dados Existentes
- [x] Inicialização de Driver Motor/Beanie 100% (Pronto para migrar documentos .NET)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
