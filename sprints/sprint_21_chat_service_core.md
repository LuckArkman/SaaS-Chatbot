# Sprint 21: Serviço de Chat em Tempo Real (FastAPI WebSockets)

**Tema**: Comunicação Instantânea.
**Objetivo**: Criar o servidor de mensageria que conecta Agentes (UI) a Clientes (WhatsApp).

## 📋 Checklist de Migração

### 1. Engine de WebSocket
- [ ] Implementar `Broadcaster` para envio de mensagens específicas por sala/chat
- [ ] Gerenciar estado online/offline dos agentes no Redis

### 2. Relay de Mensagens
- [ ] Receber do RabbitMQ (`IncomingMessage`) e repassar ao WebSocket do agente correto
- [ ] Implementar confirmação de recebimento (Ack) no lado do cliente (Vue.js)

### 3. Persistência Volátil
- [ ] Marcar mensagens como "digitando..." (typing) via Redis para feedback visual real-time

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
