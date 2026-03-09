# Sprint 26: Wrapper de Controle para Instâncias Venom/Node Bridge

**Tema**: Integração Híbrida.
**Objetivo**: Controlar o ciclo de vida dos processos Node.js através da API Python.

## 📋 Checklist de Migração

### 1. Process Management
- [x] Implementar chamadas à API da ponte (Implementado em src/services/whatsapp_bridge_service.py)
- [x] Mapear instâncias de bot por `TenantId` (Modelagem src/models/whatsapp.py completa)

### 2. Health Monitoring
- [x] Detectar se o bot está conectado (Lógica de health_check no WhatsAppManagerService)
- [x] Salvar metadados do bot (Bateria, número, status) no banco (Integrado via Bridge Sync)

### 3. Isolamento
- [x] Garantir isolamento de sessões (Cada Tenant possui um 'session_name' único no Bridge)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
