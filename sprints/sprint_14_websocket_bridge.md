# Sprint 14: WebSocket Bridge para Comunicação UI

**Tema**: Real-time Feed.
**Objetivo**: Enviar eventos de borda diretamente para o ChatUI do agente.

## 📋 Checklist de Migração

### 1. FastAPI WebSockets
- [x] Implementar Connection Manager para gerenciar sessões de agentes online (Replica SignalR Hubs em src/core/ws.py)
- [x] Criar lógica de `Broadcast` por `TenantId` (Métodos 'broadcast_to_tenant' pronto)

### 2. Bridge RabbitMQ -> WebSocket
- [x] Consumir mensagens das filas de `OutgoingNotification` (Implementado em src/core/bridge.py)
- [x] Tratar quedas de conexão e Heartbeat no lado do servidor (Heartbeat simples via 'ping' implementado)

### 3. Segurança WS
- [x] Validar token JWT no handshake do WebSocket (Validação no endpoint /ws ativa)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
