# Sprint 28: Bot Event Listeners

**Tema**: Callbacks de canal.
**Objetivo**: Escutar tudo o que o bot relata (estado da bateria, conexão aberta/fechada).

## 📋 Checklist de Migração

### 1. State Listeners
- [x] Mapear eventos: `CONNECTED`, `DISCONNECTED`, `BATERIA_LOW` (Tratado via ON_STATE_CHANGE no gateway)
- [x] Atualizar status do dispositivo no banco (Persistência em 'whatsapp_system_events')

### 2. Notificação Proativa
- [x] Notificação UI via WebSocket funcional (Enviando 'bot_system_event' para o Front-end)

### 3. Log de Eventos de Sistema
- [x] Histórico de eventos persistido no Postgres para auditoria de uptime (Tabela 'whatsapp_system_events' pronta)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
