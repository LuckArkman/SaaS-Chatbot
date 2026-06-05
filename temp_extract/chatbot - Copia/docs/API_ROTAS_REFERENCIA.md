# Referência: Rotas da API vs Cliente PHP

Documentação oficial em: `http://76.13.168.200:8001/docs` (ajuste a porta conforme `API_BASE_URL` no `.env`)

## Mapeamento rota → OmniChannelApiClient

| Método | Rota API | Método no cliente |
|--------|----------|-------------------|
| **Auth** | | |
| POST | `/api/v1/auth/login` | `authLogin(username, password)` |
| POST | `/api/v1/auth/register` | `authRegister(...)` |
| POST | `/api/v1/auth/password-recovery/{email}` | `authPasswordRecovery(email)` |
| POST | `/api/v1/auth/reset-password/` | `authResetPassword(payload)` |
| POST | `/api/v1/auth/change-password` | `authChangePassword(payload)` |
| GET | `/api/v1/auth/me` | `authMe()` |
| **Gateway** | | |
| POST | `/api/v1/gateway/webhook/{channel_type}` | `gatewayWebhook(channelType, payload)` |
| **Flows** | | |
| GET | `/api/v1/flows/` | `listFlows()` |
| POST | `/api/v1/flows/` | `createFlow(payload)` |
| GET | `/api/v1/flows/{flow_id}` | `getFlow(flowId)` |
| PATCH | `/api/v1/flows/{flow_id}` | `updateFlow(flowId, payload)` |
| DELETE | `/api/v1/flows/{flow_id}` | `deleteFlow(flowId)` |
| **Chat** | | |
| POST | `/api/v1/chat/send` | `chatSend(payload)` |
| POST | `/api/v1/chat/typing` | `chatTyping(payload)` |
| GET | `/api/v1/chat/history/{conversation_id}` | `chatHistory(conversationId)` |
| POST | `/api/v1/chat/transfer/{conversation_id}` | `chatTransfer(conversationId, payload)` |
| GET | `/api/v1/chat/presence/{user_id}` | `chatPresence(userId)` |
| **Bot** | | |
| GET | `/api/v1/bot/` | `botStatus()` |
| POST | `/api/v1/bot/start` | `botStart()` |
| DELETE | `/api/v1/bot/logout` | `botLogout()` |
| **Billing** | | |
| GET | `/api/v1/billing/plans` | `billingPlans()` |
| GET | `/api/v1/billing/my-subscription` | `billingMySubscription()` |
| POST | `/api/v1/billing/subscribe/{plan_id}` | `billingSubscribe(planId)` |
| POST | `/api/v1/billing/checkout/{plan_id}` | `billingCheckout(planId, payload)` |
| POST | `/api/v1/billing/webhook/{provider}` | `billingWebhook(provider, payload)` |
| GET | `/api/v1/billing/dashboard` | `billingDashboard()` |
| **Campaigns** | | |
| GET | `/api/v1/campaigns/` | `listCampaigns()` |
| POST | `/api/v1/campaigns/` | `createCampaign(payload)` |
| POST | `/api/v1/campaigns/{campaign_id}/schedule` | `scheduleCampaign(campaignId, payload)` |
| POST | `/api/v1/campaigns/{campaign_id}/pause` | `pauseCampaign(campaignId)` |
| **Contacts** | | |
| GET | `/api/v1/contacts/` | `listContacts()` |
| POST | `/api/v1/contacts/import` | `contactsImport(payload)` |
| POST | `/api/v1/contacts/{phone}/opt-out` | `contactsOptOut(phone)` |
| GET | `/api/v1/contacts/tags` | `contactsTags()` |
| **Admin** | | |
| GET | `/api/v1/admin/tenants/summary` | `adminTenantsSummary()` |
| GET | `/api/v1/admin/transactions` | `adminTransactions()` |
| POST | `/api/v1/admin/system/maintenance` | `adminToggleMaintenance(payload)` |

## Schemas (Swagger) – uso nas views

- **ContactOut**: contato retornado por `GET /api/v1/contacts/`. Campos comuns em APIs FastAPI: `id`, `name`, `phone` ou `phone_number`, `tags`, etc.
- **MessageOut**: mensagem no histórico (`GET /api/v1/chat/history/{conversation_id}`). Campos típicos: `content`, `side` (MessageSide), `created_at`, `sender`, etc.
- **MessageSide**: string, ex. `"user"` | `"agent"` para indicar quem enviou.
- **Token**: resposta do login: `access_token`, `token_type`.
- **User**: resposta de `auth/me`: `email`, `full_name`, etc.

As views (contatos, home) já tratam variações de nomes: `name`/`full_name`/`displayName`, `phone`/`phone_number`/`number`, e no chat `content`/`text`/`body`, `side`/`direction`/`from_me`.
