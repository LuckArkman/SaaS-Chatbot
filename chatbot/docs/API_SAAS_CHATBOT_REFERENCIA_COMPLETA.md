# API SaaS Chatbot 2.0.0 – Referência completa (consulta posterior)

**OpenAPI:** OAS 3.1 · **Base:** `/api/v1/openapi.json`  
**Descrição:** Plataforma OmniChannel de Chatbots e Atendimento Humano. Migrada de .NET para Python (FastAPI).  
**Módulos:** Auth/Tenancy, FlowEngine, WhatsApp (Venom/Evolution), Billing.  
**Autor:** Mauricio Paixão Lopes

---

## Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/auth/login` | Login Access Token. Body: `application/x-www-form-urlencoded` → `username`, `password` (como no script Python). Resposta 200: `access_token`, `token_type`. |
| POST | `/api/v1/auth/register` | Register User. Body JSON: `email`, `password` e nome/tenant em **camelCase** (`fullName`, `tenantName`) e/ou **snake_case** (`full_name`, `tenant_name`), conforme a build da API. |
| POST | `/api/v1/auth/password-recovery/{email}` | Recover Password |
| POST | `/api/v1/auth/reset-password/` | Reset Password |
| POST | `/api/v1/auth/change-password` | Change Password |
| GET | `/api/v1/auth/me` | Read User Me |

---

## Gateway

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/gateway/webhook/{channel_type}` | Incoming Webhook |

---

## Flows

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/flows/` | List Flows |
| POST | `/api/v1/flows/` | Create Flow |
| GET | `/api/v1/flows/{flow_id}` | Get Flow |
| PATCH | `/api/v1/flows/{flow_id}` | Update Flow |
| DELETE | `/api/v1/flows/{flow_id}` | Delete Flow |

---

## Chat

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/chat/send` | Send Message |
| POST | `/api/v1/chat/typing` | Update Typing |
| GET | `/api/v1/chat/history/{conversation_id}` | List Chat History |
| POST | `/api/v1/chat/transfer/{conversation_id}` | Transfer Chat Endpoint |
| GET | `/api/v1/chat/presence/{user_id}` | Get Agent Presence |

---

## Bot

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/bot/` | Get Bot Status |
| POST | `/api/v1/bot/start` | Start Bot |
| DELETE | `/api/v1/bot/logout` | Logout Bot |

---

## Billing

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/billing/plans` | List Public Plans |
| GET | `/api/v1/billing/my-subscription` | Get My Subscription |
| POST | `/api/v1/billing/subscribe/{plan_id}` | Subscribe To Plan |
| POST | `/api/v1/billing/checkout/{plan_id}` | Create Checkout Endpoint |
| POST | `/api/v1/billing/webhook/{provider}` | Payment Webhook Endpoint |
| GET | `/api/v1/billing/dashboard` | Get Financial Dashboard |

---

## Campaigns

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/campaigns/` | List Campaigns |
| POST | `/api/v1/campaigns/` | Create Campaign |
| POST | `/api/v1/campaigns/{campaign_id}/schedule` | Schedule Campaign Endpoint |
| POST | `/api/v1/campaigns/{campaign_id}/pause` | Pause Campaign Endpoint |

---

## Contacts

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/contacts/` | List Contacts |
| POST | `/api/v1/contacts/import` | Import Contacts From File |
| POST | `/api/v1/contacts/{phone}/opt-out` | Set Opt Out |
| GET | `/api/v1/contacts/tags` | List Tags |

---

## Admin

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/admin/tenants/summary` | Get Global Summary |
| GET | `/api/v1/admin/transactions` | List All Transactions |
| POST | `/api/v1/admin/system/maintenance` | Toggle Maintenance Mode |

---

## Schemas (Swagger)

- **Body_login_access_token_api_v1_auth_login_post** – login (form)
- **Body_import_contacts_from_file_api_v1_contacts_import_post**
- **ContactOut**, **MessageOut**, **MessageSide** (string)
- **CampaignCreate**, **CampaignOut**
- **FlowCreate**, **FlowUpdate**, **FlowDocument**, **FlowNode**, **FlowEdge**
- **Token**, **User**, **UserBase**, **UserRegister**
- **PasswordChangeInternal**, **PasswordResetConfirm**
- **PlanOut**, **SubscriptionOut**, **TagOut**
- **HTTPValidationError**, **ValidationError**
- **WhatsAppInstance**, **WhatsAppStatus** (string)
- **NodeType** (string), **Position**

---

*Use este ficheiro como referência nas consultas posteriores à API SaaS Chatbot. O cliente PHP está em `App\Service\OmniChannelApiClient` e o mapeamento rota→método em `docs/API_ROTAS_REFERENCIA.md`.*
