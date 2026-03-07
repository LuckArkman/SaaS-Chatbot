# Sprint 14: WebSocket Bridge para Comunicação UI

**Tema**: Real-time Feed.
**Objetivo**: Enviar eventos de borda diretamente para o ChatUI do agente.

## 📋 Checklist de Migração

### 1. FastAPI WebSockets
- [ ] Implementar Connection Manager para gerenciar sessões de agentes online
- [ ] Criar lógica de `Broadcast` por `TenantId`

### 2. Bridge RabbitMQ -> WebSocket
- [ ] Consumir mensagens das filas de `OutgoingNotification` e repassar via WS
- [ ] Tratar quedas de conexão e Heartbeat no lado do servidor

### 3. Segurança WS
- [ ] Validar token JWT no handshake do WebSocket

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
