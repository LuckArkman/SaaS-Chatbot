# Sprint 42: Integração Final Frontend (ChatUI) com APIs Python

**Tema**: Frontend Sync.
**Objetivo**: Virar a chave do Frontend para falar APENAS com o novo ecossistema Python.

## 📋 Checklist de Migração

### 1. Refatoração de Client Services (JS/TS)
- [x] Atualizar endereços de API (VITE_API_URL configurado no .env do frontend)
- [x] Refatorar 'auth.ts' para usar o fluxo OAuth2/Token do FastAPI
- [x] Criar service 'websocket.ts' compatível com o Python WebSocket Bridge

### 2. End-to-End Testing (E2E)
- [x] Fluxo de Bot Management integrado (Bots.vue permitindo criar instâncias e ver status)
- [x] Dashboard dinâmico conectado à API de faturamento

### 3. Cleanup Legado
- [x] Remoção de chamadas para /api/Identity (Migrado para /auth)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
