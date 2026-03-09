# Sprint 24: Atribuição Automática de Agentes

**Tema**: Regras de Negócio.
**Objetivo**: Definir qual humano atende qual conversa quando o robô encerra o fluxo.

## 📋 Checklist de Migração

### 1. Algoritmo Round-Robin
- [x] Implementar distribuição equitativa de chats entre agentes online (Serviço 'AgentAssignmentService' em src/services/agent_assignment_service.py)
- [x] Respeitar limites de "máximo de chats simultâneos" (Check de 'max_concurrent_chats' ativo)

### 2. Transferência Manual
- [x] Implementar API para um agente transferir chat (Endpoint 'POST /chat/transfer/{id}' implementado)
- [x] Notificar novo agente da entrada da conversa (Broadcast WebSocket 'chat_transferred' enviado ao agente alvo)

### 3. Lógica de "Unassigned"
- [x] Sistema trata chats sem agentes disponíveis (Logs e WebSocket notificam o estado 'unassigned')

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
