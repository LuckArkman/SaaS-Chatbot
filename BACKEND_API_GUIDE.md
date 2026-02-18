# Documentação Técnica: Back-end API & Ecossistema de Rotas 🚀

Este guia descreve as ferramentas, microsserviços e rotas disponíveis no back-end da plataforma SaaS OmniChannel, detalhando como o Frontend deve se conectar e quais dados são necessários para cada operação.

---

## 🏗️ Ferramentas do Back-end

A plataforma é construída sobre uma arquitetura de microsserviços utilizando **.NET 8**, **RabbitMQ** para mensageria assíncrona, e **PostgreSQL/Redis** para persistência.

| Serviço | Responsabilidade | Porta (Local) |
| :--- | :--- | :--- |
| **Identity Service** | Gateway de Autenticação, RBAC e Proxy para outros serviços. | 5051 |
| **Flow Engine** | Motor de automação, fluxos de bot e lógica de IA. | 5054 |
| **Chat Service** | Comunicação real-time via SignalR e atendentes. | 5055 |
| **Messaging** | Persistência de mensagens, conversas e contatos. | 5056 |
| **Campaign** | Disparos em massa e marketing segmentado. | 5057 |
| **Channel Gateway** | Integração técnica com Meta (WhatsApp), SMS e Webhooks. | 5058 |
| **Billing** | Gestão de planos, assinaturas e sistema de bloqueio por falta de pagamento. | 5059 |

---

## 🔒 Autenticação & Segurança

Todas as rotas (exceto Login/Register) exigem um **Token JWT** no Header:
`Authorization: Bearer {token}`

O `Identity Service` propaga este token para os serviços internos, garantindo que o contexto de **Tenant** e as permissões de acesso sejam respeitados em todo o ecossistema.

---

## 📋 Catálogo de Rotas (API para Frontend)

### 1. Autenticação (`Identity Service`)

#### `POST /api/Auth/register`
Cria uma nova conta e um novo Tenant.
- **Payload:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "João Silva",
  "tenantName": "Minha Empresa"
}
```

#### `POST /api/Auth/login`
Autentica o usuário e retorna o token JWT.
- **Payload:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

---

### 2. Automação & Bot (`FlowEngine`)

#### `GET /api/FlowEngine/flows`
Lista todos os fluxos configurados para o Tenant.

#### `POST /api/FlowEngine/flows`
Cria ou atualiza um fluxo de atendimento inteligente.
- **Payload:**
```json
{
  "name": "Fluxo de Vendas",
  "steps": [
    { "order": 1, "type": "Message", "content": "Olá!" },
    { "order": 2, "type": "AI", "content": "Assistente de vendas." }
  ]
}
```

---

### 3. Chat & Atendimento em Tempo Real (`Chat`)

#### `GET /api/Chat/history`
Recupera o histórico recente de interações do chat real-time.

#### `POST /api/Chat/send`
Envia uma mensagem manual através do sistema de chat.
- **Payload:**
```json
{
  "conversationId": "uuid",
  "content": "Olá, como posso ajudar?"
}
```

---

### 4. Gestão de Mensagens & Conversas (`Messaging`)

#### `GET /api/Messaging/conversations`
Lista todas as conversas ativas do Tenant, ordenadas por atualização.

#### `GET /api/Messaging/messages/{conversationId}`
Retorna todas as mensagens de uma conversa específica.

---

### 5. Campanhas & Marketing (`Campaign`)

#### `POST /api/Campaign`
Configura um disparo em massa.
- **Payload:**
```json
{
  "name": "Promoção Carnaval",
  "content": "Confira nossas ofertas!",
  "channel": "WhatsApp",
  "receivers": [
    { "externalId": "5511999999999" }
  ]
}
```

#### `POST /api/Campaign/{id}/start`
Inicia o processo de envio da campanha via filas de processamento.

---

### 6. Configuração de Canais (`ChannelGateway`)

#### `POST /api/ChannelGateway/whatsapp/setup`
Configura as credenciais da API da Meta para o WhatsApp.
- **Payload:**
```json
{
  "accessToken": "meta_token",
  "phoneNumberId": "id_meta",
  "verifyToken": "meu_segredo"
}
```

---

### 7. Sistema de Bloqueio (`Blocking/Billing`)

#### `GET /api/Blocking/status/{tenantId}`
Verifica se o Tenant possui acesso liberado ou se está bloqueado por falta de pagamento.

---

## 🧪 Estratégia de Testes

Para validar a integridade deste ecossistema, o projeto de testes (`SaaS.OmniChannelPlatform.Tests`) realiza:

1. **Unit Tests**: Validação das regras de negócio (Cálculo de limites de billing, processamento de passos de fluxo).
2. **Integration Tests**: Validação da comunicação via RabbitMQ e propagação de Header forwarder.
3. **End-to-End**: Simulação de recebimento de mensagem via Webhook -> Processamento por IA -> Exibição no Chat UI.
