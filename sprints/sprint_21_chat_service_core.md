# Sprint 21: Serviço de Chat em Tempo Real (FastAPI WebSockets)

**Tema**: Comunicação Instantânea.
**Objetivo**: Criar o servidor de mensageria que conecta Agentes (UI) a Clientes (WhatsApp).

## 📋 Checklist de Migração

### 1. Engine de WebSocket
- [x] Implementar `Broadcaster` para envio de mensagens específicas por sala (Método 'send_to_conversation' em src/core/ws.py)
- [x] Gerenciar estado online/offline dos agentes no Redis (Presença registrada via presence:tenant:user)

### 2. Relay de Mensagens
- [x] Receber do RabbitMQ (`IncomingMessage`) e repassar ao WebSocket (Lógica de Handover no FlowWorker ativa)
- [x] Implementar endpoint para Agente enviar mensagem (Implementado em src/api/v1/endpoints/chat.py)

### 3. Persistência Volátil
- [x] Marcar mensagens como "digitando..." via Redis (Serviço 'set_typing_status' funcional)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
