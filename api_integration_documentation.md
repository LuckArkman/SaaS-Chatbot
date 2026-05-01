# Documentação de Integração da API (SaaS Chatbot Monolith)

Esta documentação fornece uma visão meticulosa e criteriosa de todas as rotas testadas e validadas na arquitetura do Monolito Node.js. Ela destina-se a orientar a integração do Front-end (React/Vue/etc.) detalhando o formato dos formulários, os corpos das requisições, comportamentos da Engine do Baileys e todos os possíveis retornos HTTP.

---

## Índice de Rotas Validadas

1. **Autenticação e Sessão**
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/login`
2. **Ciclo de Vida do Agente WhatsApp**
   - `POST /api/v1/bot/start`
   - `GET /api/v1/bot/qr`
   - `POST /api/v1/bot/restart`
   - `POST /api/v1/bot/stop`
3. **Contatos Nativos do WhatsApp**
   - `GET /api/v1/contacts/whatsapp`
   - `POST /api/v1/contacts/whatsapp`
4. **Conversas e Histórico**
   - `GET /api/v1/chat/conversations`
   - `GET /api/v1/chat/conversations/{phone}`
   - `POST /api/v1/chat/send`
5. **Gateway & WebSockets**
   - `POST /api/v1/gateway/{channel_type}`
   - `WS /api/v1/ws/`

---

## 1. Autenticação e Sessão

### `POST /api/v1/auth/register`
Registra um novo usuário Administrador e cria automaticamente um Tenant isolado.

- **Payload Esperado (Body)**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "name": "Nome Completo",
    "tenant_name": "Nome da Empresa"
  }
  ```
- **Retornos Possíveis**
  - `201 Created`
    ```json
    {
      "id": 1,
      "email": "user@example.com",
      "tenant_id": "8A9B2C3D",
      "is_active": true,
      "is_superuser": false,
      "created_at": "2026-04-27T00:00:00.000Z"
    }
    ```
  - `400 Bad Request`: `{ "detail": "Email already registered" }`

### `POST /api/v1/auth/login`
Autentica o usuário e devolve os tokens JWT (Access e Refresh) para manter a sessão.

- **Payload Esperado (Body)**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Retornos Possíveis**
  - `200 OK`
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI...",
      "refresh_token": "eyJhbGciOiJIUzI...",
      "token_type": "bearer",
      "expires_in": 900
    }
    ```
  - `401 Unauthorized`: `{ "detail": "Incorrect email or password" }`

---

## 2. Ciclo de Vida do Agente WhatsApp

### `POST /api/v1/bot/start`
Inicia o container em memória do Baileys para o Tenant.

- **Headers**: `Authorization: Bearer <Token>`
- **Payload Esperado**: `{}` (Corpo vazio)
- **Retornos Possíveis**
  - `202 Accepted`: `{ "success": true, "status": "starting" }`
  - `400 Bad Request`: `{ "success": false, "detail": "O bot já está conectado." }`

### `GET /api/v1/bot/qr`
Recupera o QR Code atual para sincronização do aparelho.

- **Headers**: `Authorization: Bearer <Token>`
- **Retornos Possíveis**
  - `200 OK` (Quando aguardando leitura)
    ```json
    {
      "qrcode": "2@92jxKYQt/9q3n5KAZlv3SNZDwbQD/V5vE...",
      "status": "QRCODE"
    }
    ```
  - `200 OK` (Quando já conectado)
    ```json
    {
      "qrcode": null,
      "status": "CONNECTED"
    }
    ```

### `POST /api/v1/bot/stop` / `POST /api/v1/bot/restart`
Encerra ou reinicia a sessão ativa. Desconecta o celular se estiver online.

- **Headers**: `Authorization: Bearer <Token>`
- **Payload**: `{}`
- **Retornos**:
  - `200 OK`: `{ "success": true, "status": "stopped" }` (ou `restarting`)

---

## 3. Contatos Nativos do WhatsApp

### `GET /api/v1/contacts/whatsapp`
Busca, instantaneamente da memória do Baileys, toda a agenda nativa sincronizada com o aparelho.

- **Headers**: `Authorization: Bearer <Token>`
- **Retornos Possíveis**
  - `200 OK`
    ```json
    {
      "success": true,
      "total": 125,
      "contacts": [
        { "id": "5511999999999@s.whatsapp.net", "name": "João Silva", "notify": "Joao" },
        ...
      ]
    }
    ```
  - `503 Service Unavailable`: `{ "detail": "Agente não está conectado ao WhatsApp. Conecte o bot primeiro." }`

### `POST /api/v1/contacts/whatsapp`
Valida se um número de telefone tem WhatsApp ativo (usando a rede oficial) e salva no CRM.

- **Headers**: `Authorization: Bearer <Token>`
- **Payload Esperado (Body)**
  ```json
  {
    "phone": "5511999999999",
    "name": "Maria Oliveira" 
  }
  ```
- **Retornos Possíveis**
  - `201 Created`
    ```json
    {
      "success": true,
      "contact": {
        "jid": "5511999999999@s.whatsapp.net",
        "exists": true
      },
      "persisted": {
        "id": 1,
        "phone_number": "5511999999999",
        "full_name": "Maria Oliveira"
      }
    }
    ```
  - `400 Bad Request`: `{ "success": false, "detail": "O número informado não possui conta ativa no WhatsApp." }`
  - `503 Service Unavailable`: `{ "detail": "Agente não está conectado ao WhatsApp. Conecte o bot primeiro." }`

---

## 4. Conversas e Histórico

### `GET /api/v1/chat/conversations`
Retorna a lista de caixas de entrada/chats abertos no WhatsApp daquele Tenant. Remove broadcasts e newsletters.

- **Headers**: `Authorization: Bearer <Token>`
- **Query Params**: `?limit=50`
- **Retornos Possíveis**
  - `200 OK`
    ```json
    {
      "total": 5,
      "session_id": "tenant_8A9B2C3D",
      "conversations": [
        {
          "id": "5511999999999@s.whatsapp.net",
          "name": "João",
          "conversationTimestamp": 1714234500,
          "unreadCount": 2
        }
      ]
    }
    ```
  - `503 Service Unavailable`: `{ "detail": "Agente não está conectado ao WhatsApp. Conecte o bot primeiro." }`

### `GET /api/v1/chat/conversations/{phone}`
Retorna as últimas mensagens de uma conversa com um contato específico extraídas do cache nativo do Baileys (Backfill).

- **Headers**: `Authorization: Bearer <Token>`
- **Parâmetros da Rota**: `phone` (Ex: `5511999999999`)
- **Query Params**: `?limit=50`
- **Retornos Possíveis**
  - `200 OK`
    ```json
    {
      "jid": "5511999999999@s.whatsapp.net",
      "phone": "5511999999999",
      "total_messages": 20,
      "has_more": false,
      "messages": [
        {
          "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false, "id": "ABC123XYZ" },
          "message": { "conversation": "Olá, preciso de ajuda!" },
          "messageTimestamp": 1714234567
        }
      ]
    }
    ```
  - `503 Service Unavailable`: `{ "detail": "Agente não está conectado ao WhatsApp. Conecte o bot primeiro." }`

### `POST /api/v1/chat/send`
Dispara uma mensagem de texto (ou mídia) manualmente como se fosse um Agente Humano.

- **Headers**: `Authorization: Bearer <Token>`
- **Payload Esperado (Body)**
  ```json
  {
    "to": "5511999999999",
    "content": "Olá, como posso ajudar?",
    "type": "text"
  }
  ```
- **Retornos Possíveis**
  - `202 Accepted`
    ```json
    {
      "success": true,
      "message_id": "60d5ecb8b3921c2d50a0e123"
    }
    ```
  - `400 Bad Request`: `{ "detail": "Destinatário e conteúdo são obrigatórios." }`

---

## 5. Gateway & WebSockets

### `POST /api/v1/gateway/{channel_type}`
Webhook ingress para receber eventos de instâncias não gerenciadas nativamente pelo monolito. Se `channel_type` for `whatsapp`, retransmite a mensagem internamente e aciona o WebSocket.

- **Payload Esperado (Body)**
  ```json
  {
    "session": "tenant_8A9B2C3D",
    "event": "messages.upsert",
    "payload": {
      "id": "MOCK_MSG_001",
      "from": "5511999999999@s.whatsapp.net",
      "pushName": "Cliente VIP",
      "text": "Estou interessado no plano anual."
    }
  }
  ```
- **Retornos Possíveis**
  - `202 Accepted`: `{ "success": true, "status": "processing" }`

### `WS /api/v1/ws/?token={jwt_token}`
Conexão em tempo real (Native WebSocket) que alimenta a interface do SaaS. Toda mensagem trafegada no WhatsApp chega por esse canal.

- **Comportamento e Validação**
  A conexão cai (`ws.close(1008)`) imediatamente se o JWT não for fornecido ou estiver expirado.

- **Payload Disparado para o Frontend (`receive_message`)**
  Sempre que houver uma nova mensagem enviada/recebida, a tela do React captará este JSON via socket:
  ```json
  {
    "method": "receive_message",
    "params": {
      "message_id": "3A1F4C9B2E10V",
      "conversation_id": "5511999999999@s.whatsapp.net",
      "contact_phone": "5511999999999",
      "contact": {
        "phone": "5511999999999",
        "name": "Cliente VIP",
        "profile_picture": null
      },
      "content": "Estou interessado no plano anual.",
      "message_type": "text",
      "source": "user",
      "timestamp": "2026-04-27T10:00:00.000Z"
    }
  }
  ```
