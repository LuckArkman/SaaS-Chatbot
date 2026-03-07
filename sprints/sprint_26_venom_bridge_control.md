# Sprint 26: Wrapper de Controle para Instâncias Venom/Node Bridge

**Tema**: Integração Híbrida.
**Objetivo**: Controlar o ciclo de vida dos processos Node.js através da API Python.

## 📋 Checklist de Migração

### 1. Process Management
- [ ] Implementar chamadas à API da ponte (ou controle de processo via `subprocess`) para iniciar/parar bots
- [ ] Mapear instâncias de bot por `TenantId` no banco de dados

### 2. Health Monitoring
- [ ] Detectar se o processo Node.js está "vivo" e conectado ao WhatsApp Web
- [ ] Recuperar logs de erro do console Node e salvar no banco de dados Python

### 3. Isolamento
- [ ] Garantir que processos de diferentes tenants não compartilhem sessões de arquivos/cookies

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
