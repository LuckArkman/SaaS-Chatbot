# Sprint 28: Bot Event Listeners

**Tema**: Callbacks de canal.
**Objetivo**: Escutar tudo o que o bot relata (estado da bateria, conexão aberta/fechada).

## 📋 Checklist de Migração

### 1. State Listeners
- [ ] Mapear eventos: `CONNECTED`, `DISCONNECTED`, `INITIALIZING`, `BATERIA_LOW`
- [ ] Atualizar status do dispositivo no banco de dados central (Postgres)

### 2. Notificação Proativa
- [ ] Enviar notificação push/email para o admin do Tenant se o bot desconectar sem aviso

### 3. Log de Eventos de Sistema
- [ ] Manter histórico de eventos de "sobe/desce" de cada canal para auditoria de uptime

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
