# Arquitetura e Gestão de Agentes: Guia de Rotas do Backend

Documentação da infraestrutura de agentes (Humanos e de IA) no ecossistema SaaS-Chatbot: rotas de API, orquestração e controle para o Tenant.

---

## 1. Agentes de IA (Automação de Fluxos)

Agentes de IA = "Fluxos de Automação". Atendimento de primeiro nível, gatilhos por palavras-chave, lógicas complexas. Persistência em MongoDB (Beanie).

### CRUD (Flows)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/flows/` | Cria um novo Agente de IA (Fluxo). |
| GET | `/api/v1/flows/` | Lista todos os Agentes de IA do Tenant. |
| GET | `/api/v1/flows/{id}` | Detalhes (nós/bordas) de um agente. |
| PATCH | `/api/v1/flows/{id}` | Atualiza configuração (lógica, triggers, nome). |
| DELETE | `/api/v1/flows/{id}` | Remove o agente. |

### Orquestração – Tipos de nós (Nodes)

- `input`: Ponto de entrada do agente.
- `message`: Resposta textual do agente.
- `ai`: Processamento inteligente (sprint futura).
- `condition`: Ramificações por variáveis coletadas.
- `handover`: Passa o atendimento para Agente Humano.

### Controle e saúde do bot

- `WhatsAppManagerService.health_check_all()`: garante que o bot (WhatsApp) está online.
- `broadcast_to_tenant`: notifica a UI via WebSocket quando o agente entra/sai de operação.

---

## 2. Agentes Humanos (Equipe de Suporte)

Intervêm quando o Agente IA encerra ou encontra nó `handover`. Modelados como usuários com `is_agent=True`.

### Criação e perfil

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/register` | Cria usuário (pode ser promovido a Agente). |
| GET | `/api/v1/auth/me` | Status do agente logado (capacidade, departamentos). |

### Orquestração (AgentAssignmentService)

- Round-Robin balanceado.
- Verificação de online (Redis `presence`).
- Capacidade: `current_chats_count < max_concurrent_chats`.
- Filtro por departamento.

### Controle de atendimento (real-time)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/chat/history/{id}` | Histórico do chat. |
| POST | `/api/v1/chat/send` | Agente responde ao cliente. |
| POST | `/api/v1/chat/transfer/{id}` | Transfere chat para outro agente. |
| POST | `/api/v1/chat/typing` | Sinalização "digitando". |
| GET | `/api/v1/chat/presence/{id}` | Presença do agente em tempo real. |

---

## 3. Modelo de dados (User)

- `max_concurrent_chats`: atendimentos simultâneos do agente.
- `current_chats_count`: carga em tempo real.
- `departments`: departamentos em que o agente atua.

---

## 4. Fluxo de trabalho (Dono do SaaS)

1. **Criação:** Painel → cria Flow (Agente IA).
2. **Orquestração:** Define triggers (palavras-chave).
3. **Equipe:** Cria usuários e marca como Agentes.
4. **Operação:** Atribui agentes a Canais (WhatsApp) e Departamentos.
5. **Gestão:** Dashboard admin (volume, saúde dos bots).

---

## Conformidade: Cliente PHP vs Documentação

O `OmniChannelApiClient` está alinhado com as rotas descritas acima:

| Documentação | Cliente PHP | Endpoint usado |
|--------------|-------------|----------------|
| **Agentes de IA (Flows)** | | |
| POST `/api/v1/flows/` | `createFlow($payload)` | ✓ POST /api/v1/flows/ |
| GET `/api/v1/flows/` | `listFlows()` | ✓ GET /api/v1/flows/ |
| GET `/api/v1/flows/{id}` | `getFlow($flowId)` | ✓ GET /api/v1/flows/{id} |
| PATCH `/api/v1/flows/{id}` | `updateFlow($flowId, $payload)` | ✓ PATCH /api/v1/flows/{id} |
| DELETE `/api/v1/flows/{id}` | `deleteFlow($flowId)` | ✓ DELETE /api/v1/flows/{id} |
| **Auth (Agentes Humanos / Perfil)** | | |
| POST `/api/v1/auth/register` | `authRegister(...)` | ✓ |
| GET `/api/v1/auth/me` | `authMe()` | ✓ |
| **Chat (Atendimento real-time)** | | |
| GET `/api/v1/chat/history/{id}` | `chatHistory($conversationId)` | ✓ |
| POST `/api/v1/chat/send` | `chatSend($payload)` | ✓ |
| POST `/api/v1/chat/transfer/{id}` | `chatTransfer($conversationId, $payload)` | ✓ |
| POST `/api/v1/chat/typing` | `chatTyping($payload)` | ✓ |
| GET `/api/v1/chat/presence/{id}` | `chatPresence($userId)` | ✓ |

**Nodes usados no front (Chatbots):** `input`, `message` (conforme doc). Os tipos `ai`, `condition`, `handover` estão disponíveis na API para fluxos mais avançados.

*Use este ficheiro como referência nas consultas à API de agentes. Cliente: `App\Service\OmniChannelApiClient`.*
