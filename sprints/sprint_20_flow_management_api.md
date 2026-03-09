# Sprint 20: APIs de Gerenciamento de Fluxos

**Tema**: Backend Management.
**Objetivo**: Endpoints para o frontend salvar e gerenciar os fluxos criados.

## 📋 Checklist de Migração

### 1. Rotas de Admin do Flow Engine
- [x] Endpoint para Criar/Atualizar Fluxos (Implementado CRUD em src/api/v1/endpoints/flows.py)
- [x] Endpoints com Isolamento por `TenantId` (Integrado via Dependencies)

### 2. Publicação de Fluxo
- [x] Lógica de salvar e ativar fluxos no MongoDB (CRUD completo integrado via Beanie/FastAPI)

### 3. Previewer
- [ ] Implementar simulador de chat via API (Pode ser testado via Swagger local por enquanto)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
