# 🌌 Análise Profunda e Vasta do Backend do Projeto SaaS Chatbot

Esta documentação compreende uma análise extensa, exaustiva e detalhada de **todos** os scripts pertencentes ao backend da plataforma SaaS Chatbot.
A estrutura do projeto foi analisada a fundo, mapeando módulos, classes, métodos, dependências e suas funções assíncronas/síncronas no ecossistema.

---

## 📁 Diretório: `Raiz do Projeto (src/)`

### 📄 Arquivo: `main.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.FastAPI, fastapi.middleware.cors.CORSMiddleware, src.core.config.settings, src.api.v1.api.api_router, src.core.middlewares.TenancyMiddleware, src.common.error_handlers.register_error_handlers, src.core.redis.redis_client, src.core.bus.rabbitmq_bus, src.core.bridge.start_websocket_bridge, src.core.logging.setup_logging, src.common.logging_middleware.LoggingMiddleware, motor.motor_asyncio.AsyncIOMotorClient, beanie.init_beanie, src.models.mongo.flow.FlowDocument, src.models.mongo.flow.SessionStateDocument

**Funções Definidas (Módulo):**
- `def create_application() -> FastAPI`
  - *Descrição:* Equivalente ao Program.cs / CreateBuilder no .NET...

---

## 📁 Diretório: `api`

### 📄 Arquivo: `deps.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Generator, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.security.OAuth2PasswordBearer, jose.jwt, pydantic.ValidationError, sqlalchemy.orm.Session, src.core.security, src.core.config.settings, src.core.database.get_db, src.models.user.User, src.schemas.user.TokenPayload

**Funções Definidas (Módulo):**
- `def get_current_user(db, token) -> User`
  - *Descrição:* Sem docstring....
- `def get_current_active_user(current_user) -> User`
  - *Descrição:* Sem docstring....
- `def get_current_active_superuser(current_user) -> User`
  - *Descrição:* Sem docstring....

---

## 📁 Diretório: `api\v1`

### 📄 Arquivo: `api.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.APIRouter, src.api.v1.endpoints.auth, src.api.v1.endpoints.gateway, src.api.v1.endpoints.ws, src.api.v1.endpoints.flows, src.api.v1.endpoints.chat, src.api.v1.endpoints.bot, src.api.v1.endpoints.billing, src.api.v1.endpoints.campaigns, src.api.v1.endpoints.contacts, src.api.v1.endpoints.admin


---

## 📁 Diretório: `api\v1\endpoints`

### 📄 Arquivo: `admin.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, typing.Dict, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.api.deps, src.core.database.get_db, src.models.billing.Subscription, src.models.billing.Plan, src.models.transaction.Transaction, src.models.whatsapp.WhatsAppInstance, loguru.logger

**Funções Definidas (Módulo):**
- `def get_global_summary(db, current_superuser) -> Any`
  - *Descrição:* Visão geral global para SuperAdmins (Sprint 41)....
- `def list_all_transactions(db, current_superuser) -> Any`
  - *Descrição:* Lista todas as transações financeiras da plataforma....
- `def toggle_maintenance_mode(enabled, current_superuser) -> Any`
  - *Descrição:* Simula a ativação do modo de manutenção global....

---

### 📄 Arquivo: `auth.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.security.OAuth2PasswordRequestForm, sqlalchemy.orm.Session, datetime.datetime, datetime.timedelta, src.models, src.schemas, src.api.deps, src.core.security, src.core.validators

**Funções Definidas (Módulo):**
- `def login_access_token(db, form_data) -> Any`
  - *Descrição:* OAuth2 compatible token login, get an access token for future requests...
- `def register_user() -> Any`
  - *Descrição:* Registra um novo usuário e cria um novo Tenant associado....
- `def recover_password(email, db) -> Any`
  - *Descrição:* Password Recovery Logic (Stub)...
- `def reset_password(data, db) -> Any`
  - *Descrição:* Reseta a senha usando um token válido....
- `def change_password(data, db, current_user) -> Any`
  - *Descrição:* Altera a senha do usuário logado....
- `def read_user_me(current_user) -> Any`
  - *Descrição:* Get current user....

---

### 📄 Arquivo: `billing.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.services.billing_service.BillingService, src.services.payment_service.PaymentService, src.services.invoicing_service.InvoicingService, src.schemas.billing.PlanOut, src.schemas.billing.SubscriptionOut, src.api.deps, src.core.database.get_db, src.core.tenancy.get_current_tenant_id

**Funções Definidas (Módulo):**
- `def list_public_plans(db) -> Any`
  - *Descrição:* Lista todos os planos disponíveis para assinatura.
Replica o endpoint 'Pricing/Plans' do .NET....
- `def get_my_subscription(db, tenant_id, current_user) -> Any`
  - *Descrição:* Busca os detalhes da assinatura atual do Tenant ativo....
- `def subscribe_to_plan(plan_id, db, tenant_id, current_user) -> Any`
  - *Descrição:* Inicia uma nova assinatura para o Tenant.
No futuro, isto integrará com Stripe/PagSeguro (Sprint 32)....
- `def create_checkout_endpoint(plan_id, db, tenant_id, current_user) -> Any`
  - *Descrição:* Gera o checkout de pagamento (Sprint 32)....
- `def payment_webhook_endpoint(provider, payload, db) -> Any`
  - *Descrição:* Receptor global de notificações de pagamento....
- `def get_financial_dashboard(db, tenant_id, current_user) -> Any`
  - *Descrição:* Retorna o painel financeiro consolidado do Tenant (Sprint 34)....

---

### 📄 Arquivo: `bot.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.Header, sqlalchemy.orm.Session, src.schemas, src.api.deps, src.services.whatsapp_manager_service.WhatsAppManagerService, src.core.database.get_db, src.core.tenancy.get_current_tenant_id, loguru.logger

**Funções Definidas (Módulo):**
- `def get_bot_status(db, tenant_id, current_user) -> Any`
  - *Descrição:* Busca o estado do Bot do Tenant....
- `def get_bot_qr(db, tenant_id, current_user, accept) -> Any`
  - *Descrição:* Retorna o QR Code para pareamento. 
Se o header 'Accept' contiver 'text/event-stream', retorna um StreamingResponse (SSE).
Caso contrário, retorna ape...
- `def start_bot(db, tenant_id, current_user) -> Any`
  - *Descrição:* Inicia o processo Node.js do Bot (Sprint 33)....
- `def stop_bot(db, tenant_id, current_user) -> Any`
  - *Descrição:* Para o processo do Bot no Bridge....
- `def restart_bot(db, tenant_id, current_user) -> Any`
  - *Descrição:* Reinicia o processo do Bot no Bridge....
- `def logout_bot(db, tenant_id, current_user) -> Any`
  - *Descrição:* Desloga o WhatsApp e limpa a sessão....

---

### 📄 Arquivo: `campaigns.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.services.campaign_service.CampaignService, src.schemas.campaign.CampaignCreate, src.schemas.campaign.CampaignOut, src.api.deps, src.core.database.get_db, src.core.tenancy.get_current_tenant_id, src.models.campaign.Campaign, src.models.campaign.CampaignStatus

**Funções Definidas (Módulo):**
- `def list_campaigns(db, tenant_id, current_user) -> Any`
  - *Descrição:* Busca as campanhas ativas do Tenant....
- `def create_campaign(campaign_in, db, tenant_id, current_user) -> Any`
  - *Descrição:* Cria um rascunho de campanha....
- `def schedule_campaign_endpoint(campaign_id, db, tenant_id, current_user) -> Any`
  - *Descrição:* Agenda e inicia o disparo da campanha....
- `def pause_campaign_endpoint(campaign_id, db, tenant_id, current_user) -> Any`
  - *Descrição:* Pausa o disparo de uma campanha em andamento....

---

### 📄 Arquivo: `chat.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.Dict, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.Query, fastapi.status, fastapi.HTTPException, sqlalchemy.orm.Session, src.services.chat_service.ChatService, src.services.agent_assignment_service.AgentAssignmentService, src.services.message_history_service.MessageHistoryService, src.core.ws.ws_manager, src.schemas.chat.MessageOut, src.schemas.chat.ConversationListResponse

**Funções Definidas (Módulo):**
- `def send_message(payload, db, tenant_id, current_user) -> Any`
  - *Descrição:* Agente envia uma mensagem para o cliente (WhatsApp).
O payload deve conter 'conversation_id' e 'content'....
- `def update_typing(is_typing, conversation_id, tenant_id, current_user) -> Any`
  - *Descrição:* Notifica o sistema que o agente está digitando....
- `def list_chat_history(conversation_id, limit, offset, db, tenant_id, current_user) -> Any`
  - *Descrição:* Busca o histórico de mensagens de uma conversa específica....
- `def transfer_chat_endpoint(conversation_id, target_agent_id, db, tenant_id, current_user) -> Any`
  - *Descrição:* Transfere uma conversa para outro agente....
- `def get_agent_presence(user_id, tenant_id, current_user) -> Any`
  - *Descrição:* Verifica se um agente específico está online....
- `def list_conversations(limit, db, tenant_id, current_user) -> Any`
  - *Descrição:* 📱 **Lista todas as conversas abertas diretamente do WhatsApp conectado.**

Esta rota consulta o agente Baileys em tempo real, retornando os chats
pres...
- `def get_conversation_history(jid, limit, db, tenant_id, current_user) -> Any`
  - *Descrição:* 📖 **Retorna o histórico de mensagens de uma conversa específica diretamente do WhatsApp.**

Consulta o agente Baileys em tempo real e retorna as mensa...

---

### 📄 Arquivo: `contacts.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, typing.Dict, typing.Optional, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.UploadFile, fastapi.File, sqlalchemy.orm.Session, src.services.contact_service.ContactService, src.services.whatsapp_bridge_service.whatsapp_bridge, src.services.whatsapp_manager_service.WhatsAppManagerService, src.schemas.contact.ContactCreate

**Funções Definidas (Módulo):**
- `def list_contacts(db, tenant_id, current_user) -> Any`
  - *Descrição:* Busca os contatos registrados do Tenant no banco de dados interno....
- `def import_contacts_from_file(file, db, tenant_id, current_user) -> Any`
  - *Descrição:* Importa contatos de um arquivo CSV (Sprint 37)....
- `def set_opt_out(phone, db, tenant_id, current_user) -> Any`
  - *Descrição:* Ativa o Opt-out para um contato específico....
- `def list_tags(db, current_user) -> Any`
  - *Descrição:* Sem docstring....
- `def add_whatsapp_contact(payload, db, tenant_id, current_user) -> Any`
  - *Descrição:* Rota 1: Adicionar novo contato de WhatsApp.

Fluxo:
1. Recupera a sessão ativa do Tenant.
2. Garante que o bot está CONNECTED (necessário para chamar ...
- `def list_whatsapp_contacts(db, tenant_id, current_user) -> Any`
  - *Descrição:* Rota 2: Listar todos os contatos do WhatsApp do agente.

Fluxo:
1. Recupera a sessão ativa do Tenant.
2. Garante que o bot está CONNECTED.
3. Chama o ...
- `def edit_whatsapp_contact(phone, payload, db, tenant_id, current_user) -> Any`
  - *Descrição:* Sem docstring....
- `def delete_whatsapp_contact(phone, db, tenant_id, current_user) -> Any`
  - *Descrição:* Sem docstring....

---

### 📄 Arquivo: `flows.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, src.models.mongo.flow.FlowDocument, src.schemas.flow.FlowCreate, src.schemas.flow.FlowUpdate, src.api.deps, src.core.tenancy.get_current_tenant_id, loguru.logger, beanie.PydanticObjectId

**Funções Definidas (Módulo):**
- `def list_flows(tenant_id, current_user) -> Any`
  - *Descrição:* Lista todos os fluxos do Tenant....
- `def create_flow(flow_in, tenant_id, current_user) -> Any`
  - *Descrição:* Cria um novo fluxo de automação....
- `def get_flow(flow_id, tenant_id, current_user) -> Any`
  - *Descrição:* Busca um fluxo específico por ID....
- `def update_flow(flow_id, flow_in, tenant_id, current_user) -> Any`
  - *Descrição:* Atualiza um fluxo existente....
- `def delete_flow(flow_id, tenant_id, current_user) -> Any`
  - *Descrição:* Remove um fluxo....

---

### 📄 Arquivo: `gateway.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, fastapi.APIRouter, fastapi.Depends, fastapi.Header, fastapi.HTTPException, fastapi.status, src.schemas, src.schemas.whatsapp.WhatsAppPayload, src.schemas.whatsapp.WhatsAppMessageEvent, src.schemas.whatsapp.WhatsAppAckStatus, src.services.message_normalizer.MessageNormalizer, src.core.bus.rabbitmq_bus, src.core.tenancy.get_current_tenant_id, src.core.tenancy.set_current_tenant_id, src.core.database.SessionLocal

**Funções Definidas (Módulo):**
- `def verify_gateway_key(x_api_key) -> None`
  - *Descrição:* Sem docstring....
- `def normalize_webhook_payload(raw) -> dict`
  - *Descrição:* Normaliza o payload recebido para o formato esperado por WhatsAppPayload.

Aceita múltiplos formatos:
- Formato canônico do Bridge Baileys:  {event, s...
- `def incoming_webhook(channel_type, request, api_key) -> Any`
  - *Descrição:* Endpoint de Webhook especializado para WhatsApp (Venom/Evolution) e outros canais.

Aceita tanto o formato canônico do Bridge Baileys quanto o formato...

---

### 📄 Arquivo: `ws.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.APIRouter, fastapi.WebSocket, fastapi.WebSocketDisconnect, fastapi.Query, fastapi.Depends, src.core.ws.ws_manager, src.api.deps, src.core.security, loguru.logger, json

**Funções Definidas (Módulo):**
- `def websocket_endpoint(websocket, token) -> None`
  - *Descrição:* Endpoint WebSocket seguro. Exige Token JWT via Query Parameter.
Responsável por manter a bridge de eventos Real-time com o Frontend....

---

## 📁 Diretório: `common`

### 📄 Arquivo: `error_handlers.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.Request, fastapi.FastAPI, fastapi.responses.JSONResponse, fastapi.exceptions.RequestValidationError, src.common.exceptions.AppException, loguru.logger, traceback, fastapi.encoders.jsonable_encoder

**Funções Definidas (Módulo):**
- `def register_error_handlers(app) -> None`
  - *Descrição:* Sem docstring....

---

### 📄 Arquivo: `exceptions.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.Dict, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `AppException`
- **Herda de:** `Exception`
- **Descrição:** Base exception for the application.
- **Métodos:**
  - `def __init__(self, message, code, status_code, payload)`
    - *Ação:* Sem docstring....

#### 🏛️ Classe: `ValidationException`
- **Herda de:** `AppException`
- **Descrição:** Exception for validation errors (400).
- **Métodos:**
  - `def __init__(self, message, code, payload)`
    - *Ação:* Sem docstring....

#### 🏛️ Classe: `NotFoundException`
- **Herda de:** `AppException`
- **Descrição:** Exception when a resource is not found (404).
- **Métodos:**
  - `def __init__(self, message, code)`
    - *Ação:* Sem docstring....

#### 🏛️ Classe: `UnauthorizedException`
- **Herda de:** `AppException`
- **Descrição:** Exception for auth failures (401).
- **Métodos:**
  - `def __init__(self, message, code)`
    - *Ação:* Sem docstring....

#### 🏛️ Classe: `ForbiddenException`
- **Herda de:** `AppException`
- **Descrição:** Exception for permission failures (403).
- **Métodos:**
  - `def __init__(self, message, code)`
    - *Ação:* Sem docstring....


---

### 📄 Arquivo: `logging_middleware.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.Request, uuid, time, loguru.logger, starlette.middleware.base.BaseHTTPMiddleware, src.core.tenancy.get_current_tenant_id

**Classes Definidas:**
#### 🏛️ Classe: `LoggingMiddleware`
- **Herda de:** `BaseHTTPMiddleware`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def dispatch(self, request, call_next)`
    - *Ação:* Sem docstring....


---

### 📄 Arquivo: `schemas.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- enum.Enum, typing.Optional, typing.Dict, typing.Any, pydantic.BaseModel, pydantic.Field, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `ChannelType`
- **Herda de:** `str, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `UnifiedMessageType`
- **Herda de:** `str, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `UnifiedMessage`
- **Herda de:** `BaseModel`
- **Descrição:** O formato canônico de mensagem para todo o ecossistema SaaS Chatbot.
Dessa forma, o FlowEngine e o ChatService não precisam saber de qual canal a mensagem veio.
Repreplacing the 'MessageDTO' from the original .NET project.
- **Métodos:**
  - `def sanitize_content(self)`
    - *Ação:* Limpeza básica do conteúdo textual....


---

## 📁 Diretório: `core`

### 📄 Arquivo: `bridge.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.ws.ws_manager, loguru.logger, json, asyncio

**Funções Definidas (Módulo):**
- `def start_websocket_bridge() -> None`
  - *Descrição:* Task de segundo plano que escuta eventos do RabbitMQ e repassa
para as sessões de WebSocket (SignalR-like Bridge)....

---

### 📄 Arquivo: `bus.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- aio_pika, json, src.core.config.settings, loguru.logger, typing.Any, typing.Callable, typing.Awaitable

**Classes Definidas:**
#### 🏛️ Classe: `RabbitMQBus`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def __init__(self)`
    - *Ação:* Sem docstring....
  - `def connect(self)`
    - *Ação:* Estabelece conexão robusta com RabbitMQ (Auto-reconnect nativo)....
  - `def disconnect(self)`
    - *Ação:* Fecha a conexão com o RabbitMQ....
  - `def publish(self, exchange_name, routing_key, message)`
    - *Ação:* Publica uma mensagem em uma Exchange....
  - `def subscribe(self, queue_name, routing_key, exchange_name, callback)`
    - *Ação:* Inscreve um consumidor em uma fila ligada a uma Exchange....


---

### 📄 Arquivo: `config.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- os, pydantic_settings.BaseSettings, pydantic_settings.SettingsConfigDict, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `Settings`
- **Herda de:** `BaseSettings`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def DATABASE_URL(self)`
    - *Ação:* Sem docstring....


---

### 📄 Arquivo: `database.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.create_engine, sqlalchemy.ext.declarative.declarative_base, sqlalchemy.orm.sessionmaker, src.core.config.settings

**Funções Definidas (Módulo):**
- `def get_db() -> None`
  - *Descrição:* Sem docstring....

---

### 📄 Arquivo: `logging.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sys, loguru.logger, src.core.config.settings

**Funções Definidas (Módulo):**
- `def setup_logging() -> None`
  - *Descrição:* Sem docstring....

---

### 📄 Arquivo: `middlewares.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.Request, fastapi.status, fastapi.responses.JSONResponse, starlette.middleware.base.BaseHTTPMiddleware, src.core.tenancy.set_current_tenant_id, src.core.security.ALGORITHM, src.core.config.settings, src.core.database.SessionLocal, src.services.billing_service.BillingService, jose.jwt, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `TenancyMiddleware`
- **Herda de:** `BaseHTTPMiddleware`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def dispatch(self, request, call_next)`
    - *Ação:* Intercepta a requisição para identificar o Tenant e verificar seu plano (Sprint 31).
Exclui rotas cr...


---

### 📄 Arquivo: `multi_tenancy.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.String, sqlalchemy.event, sqlalchemy.orm.Session, sqlalchemy.orm.with_loader_criteria, src.core.tenancy.get_current_tenant_id

**Classes Definidas:**
#### 🏛️ Classe: `MultiTenantMixin`
- **Descrição:** Mixin para adicionar isolamento de Tenant às entidades.

**Funções Definidas (Módulo):**
- `def _add_tenant_filter(execute_state) -> None`
  - *Descrição:* Injeta automaticamente o filtro 'WHERE tenant_id = ...' em todas as queries
de modelos que herdam de MultiTenantMixin.
Equivalente ao Global Query Fil...
- `def tenant_persistence_hook(mapper, connection, target) -> None`
  - *Descrição:* Garante que o tenant_id seja injetado no objeto antes de ser persistido....

---

### 📄 Arquivo: `redis.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- redis.asyncio, src.core.config.settings, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `RedisClient`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def __init__(self)`
    - *Ação:* Sem docstring....
  - `def connect(self)`
    - *Ação:* Estabiliza a conexão assíncrona com o Redis....
  - `def disconnect(self)`
    - *Ação:* Fecha a conexão com o Redis....
  - `def get(self, key)`
    - *Ação:* Sem docstring....
  - `def set(self, key, value, expire)`
    - *Ação:* Sem docstring....
  - `def delete(self, key)`
    - *Ação:* Sem docstring....
  - `def exists(self, key)`
    - *Ação:* Sem docstring....


---

### 📄 Arquivo: `security.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- datetime.datetime, datetime.timedelta, typing.Any, typing.Union, jose.jwt, passlib.context.CryptContext, src.core.config.settings

**Funções Definidas (Módulo):**
- `def create_access_token(subject, tenant_id, expires_delta) -> str`
  - *Descrição:* Sem docstring....
- `def verify_password(plain_password, hashed_password) -> bool`
  - *Descrição:* Sem docstring....
- `def get_password_hash(password) -> str`
  - *Descrição:* Sem docstring....

---

### 📄 Arquivo: `tenancy.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- contextvars.ContextVar, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `TenantContextError`
- **Herda de:** `Exception`
- **Descrição:** Erro lançado quando o Tenant ID não é encontrado no contexto quando obrigatório.

**Funções Definidas (Módulo):**
- `def get_current_tenant_id() -> Optional[str]`
  - *Descrição:* Retorna o Tenant ID do contexto atual....
- `def set_current_tenant_id(tenant_id) -> None`
  - *Descrição:* Define o Tenant ID no contexto da requisição atual....

---

### 📄 Arquivo: `validators.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- re, fastapi.HTTPException, fastapi.status

**Funções Definidas (Módulo):**
- `def validate_password_complexity(password) -> None`
  - *Descrição:* Replicando regras do IdentityOptions do .NET:
- Mínimo 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos uma letra minúscula
- Pelo menos um ...

---

### 📄 Arquivo: `ws.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Dict, typing.List, fastapi.WebSocket, src.core.redis.redis_client, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `ConnectionManager`
- **Descrição:** Gerencia as conexões WebSocket ativas, agrupadas por Tenant e Usuário.
Replica a lógica de Hubs do SignalR no .NET.
- **Métodos:**
  - `def __init__(self)`
    - *Ação:* Sem docstring....
  - `def connect(self, tenant_id, user_id, websocket)`
    - *Ação:* Aceita uma nova conexão e armazena no contexto do Tenant/User....
  - `def disconnect(self, tenant_id, user_id, websocket)`
    - *Ação:* Remove uma conexão encerrada....
  - `def send_to_conversation(self, tenant_id, conversation_id, message)`
    - *Ação:* Envia mensagem para todos os agentes que estão 'ouvindo' uma conversa específica.
Estratégia de Broa...
  - `def send_personal_message(self, tenant_id, user_id, message)`
    - *Ação:* Envia mensagem para todas as sessões abertas de um usuário específico....
  - `def broadcast_to_tenant(self, tenant_id, message)`
    - *Ação:* Envia mensagem para todos os usuários online de um Tenant específico....


---

## 📁 Diretório: `models`

### 📄 Arquivo: `billing.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.Float, sqlalchemy.ForeignKey, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `Plan`
- **Herda de:** `Base`
- **Descrição:** Tabela global de planos disponíveis (SaaS).
Replaces the 'PricingPlan' entity from .NET.

#### 🏛️ Classe: `Subscription`
- **Herda de:** `Base`
- **Descrição:** Atribuição de um plano a um Tenant.
Diferente de outros modelos, este não usa MultiTenantMixin para filtragem global
pois ele é a PRÓPRIA definição do acesso do Tenant.


---

### 📄 Arquivo: `campaign.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.ForeignKey, sqlalchemy.Boolean, sqlalchemy.JSON, sqlalchemy.event, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook, datetime.datetime, enum.Enum

**Classes Definidas:**
#### 🏛️ Classe: `CampaignStatus`
- **Herda de:** `str, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `Campaign`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Modelo de Campanhas de Disparo Massivo.
Replaces 'MassCampaign' entity from .NET.

#### 🏛️ Classe: `CampaignContact`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Fila de disparos individuais de uma campanha.


---

### 📄 Arquivo: `chat.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.ForeignKey, sqlalchemy.Text, sqlalchemy.Enum, sqlalchemy.event, sqlalchemy.Index, sqlalchemy.orm.relationship, datetime.datetime, enum, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin

**Classes Definidas:**
#### 🏛️ Classe: `MessageSide`
- **Herda de:** `str, enum.Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `MessageStatus`
- **Herda de:** `str, enum.Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `Conversation`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Representação de uma conversa entre um contato e um Tenant.
Replaces the 'Conversation' entity from .NET.

#### 🏛️ Classe: `Message`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Registro histórico de cada interação.


---

### 📄 Arquivo: `contact.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.Table, sqlalchemy.ForeignKey, sqlalchemy.event, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `Tag`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Tags para segmentação de contatos.
Replaces 'LeadTag' from .NET.

#### 🏛️ Classe: `Contact`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Lead/Contato global do Tenant.
Utilizado para campanhas e CRM.


---

### 📄 Arquivo: `department.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.ForeignKey, sqlalchemy.Table, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin

**Classes Definidas:**
#### 🏛️ Classe: `Department`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Representação de um Departamento/Setor (Ex: Vendas, Suporte).
Replaces the 'Department' entity from .NET.


---

### 📄 Arquivo: `invoice.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Float, sqlalchemy.DateTime, sqlalchemy.ForeignKey, sqlalchemy.event, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `Invoice`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Fatura mensal gerada para o Tenant.
Replica a entidade 'InvoiceRecord' do .NET.


---

### 📄 Arquivo: `transaction.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Float, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.event, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `Transaction`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Log histórico de pagamentos e transações financeiras (SaaS).
Substitui a entidade 'PaymentTransaction' do .NET.


---

### 📄 Arquivo: `user.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Boolean, sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.DateTime, sqlalchemy.orm.relationship, datetime.datetime, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin

**Classes Definidas:**
#### 🏛️ Classe: `User`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Sem docstring.


---

### 📄 Arquivo: `whatsapp.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.Enum, sqlalchemy.event, datetime.datetime, enum, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppStatus`
- **Herda de:** `str, enum.Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `WhatsAppInstance`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Representação persistente de uma instância do WhatsApp (Venom Session).
Replaces the 'BotInstance' C# entity from .NET.


---

### 📄 Arquivo: `whatsapp_events.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.ForeignKey, sqlalchemy.event, datetime.datetime, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppSystemEvent`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Log de eventos de sistema reportados pelas instâncias do WhatsApp.
Usado para auditoria de uptime e health metrics.
Replaces the 'BotEventLog' from .NET.


---

## 📁 Diretório: `models\mongo`

### 📄 Arquivo: `chat.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, typing.List, datetime.datetime, beanie.Document, beanie.Indexed, beanie.PydanticObjectId, pydantic.Field, enum

**Classes Definidas:**
#### 🏛️ Classe: `MessageSource`
- **Herda de:** `str, enum.Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `MessageDocument`
- **Herda de:** `Document`
- **Descrição:** Persistência completa de cada interação no SaaS (Sprint 40).
Permite restaurar o histórico completo após sincronização do WhatsApp.


---

### 📄 Arquivo: `flow.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.List, typing.Optional, typing.Any, datetime.datetime, beanie.Document, beanie.Indexed, beanie.PydanticObjectId, pydantic.Field, src.schemas.flow.FlowNode, src.schemas.flow.FlowEdge

**Classes Definidas:**
#### 🏛️ Classe: `FlowDocument`
- **Herda de:** `Document`
- **Descrição:** Representação persistente de um Fluxo no MongoDB via Beanie.
Replaces the 'Flow' C# entity from .NET.

#### 🏛️ Classe: `SessionStateDocument`
- **Herda de:** `Document`
- **Descrição:** Estado da sessão atual de um usuário em um fluxo específico.
Controla em qual nó o usuário parou e as variáveis coletadas.


---

## 📁 Diretório: `schemas`

### 📄 Arquivo: `base.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Generic, typing.TypeVar, typing.List, typing.Optional, typing.Any, pydantic.BaseModel

**Classes Definidas:**
#### 🏛️ Classe: `BaseResponse`
- **Herda de:** `BaseModel, Generic[T]`
- **Descrição:** Wrapper padrão para respostas da API.

#### 🏛️ Classe: `PagedResponse`
- **Herda de:** `BaseModel, Generic[T]`
- **Descrição:** Wrapper para listas paginadas.

#### 🏛️ Classe: `ErrorDetail`
- **Herda de:** `BaseModel`
- **Descrição:** Estrutura detalhada de erro.

#### 🏛️ Classe: `ErrorResponse`
- **Herda de:** `BaseModel`
- **Descrição:** Resposta padrão de erro.


---

### 📄 Arquivo: `billing.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, typing.List, pydantic.BaseModel, pydantic.Field, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `PlanBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `PlanCreate`
- **Herda de:** `PlanBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `PlanOut`
- **Herda de:** `PlanBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `SubscriptionBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `SubscriptionCreate`
- **Herda de:** `SubscriptionBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `SubscriptionOut`
- **Herda de:** `SubscriptionBase`
- **Descrição:** Sem docstring.


---

### 📄 Arquivo: `campaign.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, typing.List, pydantic.BaseModel, pydantic.ConfigDict, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `CampaignBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `CampaignCreate`
- **Herda de:** `CampaignBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `CampaignOut`
- **Herda de:** `CampaignBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `CampaignContactBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `CampaignContactOut`
- **Herda de:** `CampaignContactBase`
- **Descrição:** Sem docstring.


---

### 📄 Arquivo: `chat.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.List, typing.Optional, datetime.datetime, pydantic.BaseModel, pydantic.Field, src.models.chat.MessageSide

**Classes Definidas:**
#### 🏛️ Classe: `MessageBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `MessageCreate`
- **Herda de:** `MessageBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `MessageOut`
- **Herda de:** `MessageBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `AgentSummary`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `ConversationOut`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `ConversationWithMessages`
- **Herda de:** `ConversationOut`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `ConversationListResponse`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `ConversationDetailResponse`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.


---

### 📄 Arquivo: `common.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- re, typing.Annotated, pydantic.AfterValidator

**Funções Definidas (Módulo):**
- `def validate_whatsapp_phone(v) -> str`
  - *Descrição:* Validador customizado para garantir formato internacional de telefone....

---

### 📄 Arquivo: `contact.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, typing.List, pydantic.BaseModel, pydantic.ConfigDict, pydantic.field_validator, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `TagBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `TagCreate`
- **Herda de:** `TagBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `TagOut`
- **Herda de:** `TagBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `ContactBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `ContactCreate`
- **Herda de:** `ContactBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `ContactOut`
- **Herda de:** `ContactBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `WhatsAppContactAdd`
- **Herda de:** `BaseModel`
- **Descrição:** Payload para adicionar/verificar um contato no WhatsApp do agente.
- **Métodos:**
  - `def phone_must_have_digits(cls, v)`
    - *Ação:* Sem docstring....

#### 🏛️ Classe: `WhatsAppContactVerified`
- **Herda de:** `BaseModel`
- **Descrição:** Contato verificado/retornado pelo Bridge.

#### 🏛️ Classe: `WhatsAppContactAddOut`
- **Herda de:** `BaseModel`
- **Descrição:** Resposta da rota POST /contacts/whatsapp.

#### 🏛️ Classe: `WhatsAppContactListOut`
- **Herda de:** `BaseModel`
- **Descrição:** Resposta da rota GET /contacts/whatsapp.


---

### 📄 Arquivo: `filters.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, pydantic.BaseModel, pydantic.Field

**Classes Definidas:**
#### 🏛️ Classe: `FilterParams`
- **Herda de:** `BaseModel`
- **Descrição:** Parâmetros base para filtragem, ordenação e paginação.
Inspirado nos padrões OData/REST do .NET.
- **Métodos:**
  - `def skip(self)`
    - *Ação:* Sem docstring....


---

### 📄 Arquivo: `flow.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- enum.Enum, typing.List, typing.Dict, typing.Optional, typing.Any, pydantic.BaseModel, pydantic.Field, pydantic.field_validator

**Classes Definidas:**
#### 🏛️ Classe: `NodeType`
- **Herda de:** `str, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `Position`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `FlowNode`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def validate_data(cls, v)`
    - *Ação:* Sem docstring....

#### 🏛️ Classe: `FlowEdge`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `FlowDefinition`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `FlowCreate`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `FlowUpdate`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.


---

### 📄 Arquivo: `gateway.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- enum.Enum, typing.Optional, typing.Dict, typing.Any, pydantic.BaseModel, pydantic.Field, src.schemas.common.WhatsAppPhone

**Classes Definidas:**
#### 🏛️ Classe: `MessageType`
- **Herda de:** `str, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `IncomingMessage`
- **Herda de:** `BaseModel`
- **Descrição:** Schema para mensagens recebidas dos canais (WhatsApp/Bot).


---

### 📄 Arquivo: `user.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, pydantic.BaseModel, pydantic.EmailStr, pydantic.BaseModel, pydantic.EmailStr, pydantic.Field

**Classes Definidas:**
#### 🏛️ Classe: `UserBase`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `UserCreate`
- **Herda de:** `UserBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `UserUpdate`
- **Herda de:** `UserBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `UserInDBBase`
- **Herda de:** `UserBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `User`
- **Herda de:** `UserInDBBase`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `UserRegister`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `PasswordResetRequest`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `PasswordResetConfirm`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `PasswordChangeInternal`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `Token`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `TokenPayload`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.


---

### 📄 Arquivo: `whatsapp.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- enum.Enum, typing.Optional, typing.Dict, typing.Any, typing.List, datetime.datetime, pydantic.BaseModel, pydantic.ConfigDict, pydantic.Field, src.schemas.gateway.MessageType

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppStatus`
- **Herda de:** `str, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `WhatsAppInstance`
- **Herda de:** `BaseModel`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `WhatsAppMessageEvent`
- **Herda de:** `str, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `WhatsAppAckStatus`
- **Herda de:** `int, Enum`
- **Descrição:** Sem docstring.

#### 🏛️ Classe: `WhatsAppPayload`
- **Herda de:** `BaseModel`
- **Descrição:** Payload bruto recebido do Venom-bot/Evolution API.

#### 🏛️ Classe: `WhatsAppMessage`
- **Herda de:** `BaseModel`
- **Descrição:** Estrutura de uma mensagem dentro do payload do WhatsApp.

#### 🏛️ Classe: `WhatsAppAck`
- **Herda de:** `BaseModel`
- **Descrição:** Estrutura de confirmação de leitura/entrega.


---

## 📁 Diretório: `services`

### 📄 Arquivo: `agent_assignment_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.user.User, src.models.chat.Conversation, src.core.redis.redis_client, loguru.logger, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `AgentAssignmentService`
- **Descrição:** Motor de distribuição automática de chats (Round-Robin).
Substitui a lógica de 'AgentDispatch' do .NET.
- **Métodos:**
  - `def assign_agent(db, conversation)`
    - *Ação:* Encontra o melhor agente disponível e atribui à conversa.
Critérios: Online no Redis, IsAgent=True, ...
  - `def transfer_chat(db, conversation, target_agent_id)`
    - *Ação:* Transfere manualmente o chat para outro agente....


---

### 📄 Arquivo: `billing_notification_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.billing.Subscription, src.services.invoicing_service.InvoicingService, datetime.datetime, datetime.timedelta, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `BillingNotificationService`
- **Descrição:** Controlador de Retenção e Alertas de Faturamento.
Replica o 'SubscriptionGuard' do .NET.
- **Métodos:**
  - `def process_billing_heartbeat(db)`
    - *Ação:* Varredura periódica para gerenciar o ciclo de vida das assinaturas.
Executado via background task no...


---

### 📄 Arquivo: `billing_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.billing.Plan, src.models.billing.Subscription, loguru.logger, typing.List, typing.Optional, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `BillingService`
- **Descrição:** Gerenciador de faturamento e assinaturas.
Replica a lógica de 'BillingEngine' do .NET.
- **Métodos:**
  - `def list_public_plans(db)`
    - *Ação:* Retorna todos os planos ativos disponíveis....
  - `def get_tenant_subscription(db, tenant_id)`
    - *Ação:* Busca a assinatura atual do Tenant....
  - `def check_plan_validity(db, tenant_id)`
    - *Ação:* Verifica se o plano está ativo e dentro do prazo.
Grace Period de 3 dias para renovação opcional....
  - `def assign_default_plan(db, tenant_id)`
    - *Ação:* Atribui o plano 'Trial' ou 'Gratuito' para novos tenants....


---

### 📄 Arquivo: `cache.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- json, typing.Any, typing.Optional, src.core.redis.redis_client

**Classes Definidas:**
#### 🏛️ Classe: `CacheService`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def get_json(key)`
    - *Ação:* Recupera um objeto JSON do cache e deserializa....
  - `def set_json(key, value, expire)`
    - *Ação:* Serializa um objeto para JSON e salva no cache....
  - `def remove(key)`
    - *Ação:* Remove uma chave do cache....


---

### 📄 Arquivo: `campaign_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.campaign.Campaign, src.models.campaign.CampaignContact, src.models.campaign.CampaignStatus, loguru.logger, typing.List, typing.Optional, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `CampaignService`
- **Descrição:** Controlador de campanhas e disparos em massa.
Replicando 'BroadcastingService' do .NET.
- **Métodos:**
  - `def create_campaign(db, tenant_id, name, message)`
    - *Ação:* Cria um rascunho de campanha....
  - `def add_contacts(db, campaign_id, contacts)`
    - *Ação:* Adiciona contatos para o disparo (Sprint 37 irá expandir)....
  - `def schedule_campaign(db, campaign_id)`
    - *Ação:* Marca a campanha como agendada para o Worker processar....


---

### 📄 Arquivo: `chat_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.List, typing.Optional, typing.Any, typing.Dict, datetime.datetime, src.models.mongo.chat.MessageDocument, src.models.mongo.chat.MessageSource, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.bus.rabbitmq_bus, src.core.redis.redis_client, src.core.ws.ws_manager, sqlalchemy.orm.Session, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `ChatService`
- **Descrição:** Serviço Unificado de Chat (Postgres + MongoDB).
Controla interações em tempo real (Sprint 21) e Persistência de Histórico (Sprint 40).
- **Métodos:**
  - `def normalize_phone(phone, country_code)`
    - *Ação:* Normaliza um número de telefone garantindo que o código de país (DDI) está presente.

Lógica de deci...
  - `def _resolve_recipient_phone(db, tenant_id, conversation_id)`
    - *Ação:* Resolve o número de telefone do destinatário a partir de múltiplas fontes,
em ordem de prioridade — ...
  - `def send_agent_message(db, tenant_id, agent_id, payload)`
    - *Ação:* Envia uma mensagem do agente para o cliente final e persiste no histórico (Dual Write).
O campo 'con...
  - `def set_typing_status(tenant_id, conversation_id, is_typing)`
    - *Ação:* Define o status de 'digitando' no Redis e notifica outros agentes....
  - `def save_message(tenant_id, session_name, contact_phone, content, source, contact_name, message_type, external_id, flow_id)`
    - *Ação:* Salva uma mensagem diretamente no MongoDB (Beanie)....
  - `def get_history(tenant_id, contact_phone, limit)`
    - *Ação:* Recupera o histórico de conversas de um contato....
  - `def get_session_history(tenant_id, session_name, limit)`
    - *Ação:* Recupera o histórico de uma sessão inteira (vários contatos)....


---

### 📄 Arquivo: `condition_evaluator.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- re, typing.Any, typing.Dict, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `ConditionEvaluator`
- **Descrição:** Avalia expressões lógicas simples baseadas em variáveis de sessão.
Suporta formatos como: {{variable_name}} == "value", {{count}} > 5, etc.
Replicando a lógica de condições do FlowBuilder original.
- **Métodos:**
  - `def evaluate(expression, variables)`
    - *Ação:* Sem docstring....
  - `def inject_variables(text, variables)`
    - *Ação:* Substitui placeholders no texto final enviado ao usuário....


---

### 📄 Arquivo: `contact_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.contact.Contact, src.models.contact.Tag, loguru.logger, typing.List, typing.Dict, typing.Any, typing.Optional, io, csv

**Classes Definidas:**
#### 🏛️ Classe: `ContactService`
- **Descrição:** Motor de Importação e Segmentação de Leads.
Replica o 'LeadImporterService' do .NET.
- **Métodos:**
  - `def normalize_phone(phone)`
    - *Ação:* Normaliza o número para o padrão DDI + DDD + Número....
  - `def import_csv(db, tenant_id, csv_content)`
    - *Ação:* Processa um arquivo CSV e importa contatos novos....
  - `def get_contacts_by_tags(db, tenant_id, tag_ids)`
    - *Ação:* Filtra contatos que possuem as tags especificadas (Segmentação)....
  - `def set_blacklist(db, tenant_id, phone, status)`
    - *Ação:* Marca um contato como Blacklist (Opt-out)....


---

### 📄 Arquivo: `flow_executor.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.Dict, typing.List, typing.Optional, src.schemas.flow.FlowDefinition, src.schemas.flow.FlowNode, src.schemas.flow.NodeType, src.models.mongo.flow.SessionStateDocument, src.services.flow_interpreter.FlowGraph, src.services.node_actions.NodeActions, src.services.session_service.SessionService, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `FlowExecutor`
- **Descrição:** Motor Principal de Execução de Fluxo.
Responsável por transitar entre nodes e disparar as ações corretas.
Replicando o motor central do FlowEngine C#.
- **Métodos:**
  - `def __init__(self, definition)`
    - *Ação:* Sem docstring....
  - `def run_step(self, session, user_input)`
    - *Ação:* Executa o próximo passo do fluxo baseado no estado atual da sessão....


---

### 📄 Arquivo: `flow_interpreter.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.List, typing.Dict, typing.Optional, typing.Any, src.schemas.flow.FlowDefinition, src.schemas.flow.FlowNode, src.schemas.flow.FlowEdge, src.schemas.flow.NodeType, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `FlowGraph`
- **Descrição:** Representação em Grafo de um Fluxo de Automação para rápida travessia.
Replica a lógica da engine C# do FlowBuilder original.
- **Métodos:**
  - `def __init__(self, definition)`
    - *Ação:* Sem docstring....
  - `def find_start_node(self)`
    - *Ação:* Busca o nó inicial (Tipo 'input' no Vue Flow)....
  - `def get_next_node(self, current_node_id, criteria)`
    - *Ação:* Determina o próximo nó a ser executado.
Pode lidar com múltiplas saídas (ex: Condição baseada em 'cr...
  - `def validate_flow(self)`
    - *Ação:* Valida se o fluxo tem início e se há ciclos infinitos simples....


---

### 📄 Arquivo: `gemini_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- httpx, typing.List, typing.Dict, typing.Optional, src.core.config.settings, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `GeminiService`
- **Descrição:** Serviço de integração com o Google Gemma 3 12B via Google AI Studio API.
Suporta histórico de conversa multi-turn para respostas contextuais.
- **Métodos:**
  - `def _api_url(cls)`
    - *Ação:* Sem docstring....
  - `def generate_response(user_message, system_prompt, conversation_history)`
    - *Ação:* Envia uma mensagem ao Gemini e retorna a resposta gerada.

Args:
    user_message: Mensagem mais rec...
  - `def build_history_from_messages(messages)`
    - *Ação:* Converte o histórico de mensagens do MongoDB/Postgres
para o formato multi-turn do Gemini.

Esperado...


---

### 📄 Arquivo: `invoicing_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.invoice.Invoice, src.models.billing.Subscription, src.models.billing.Plan, src.models.transaction.Transaction, datetime.datetime, datetime.timedelta, loguru.logger, typing.List, typing.Dict, typing.Any, uuid

**Classes Definidas:**
#### 🏛️ Classe: `InvoicingService`
- **Descrição:** Gerador de Faturas e Dashboards Financeiros.
Replica a lógica de 'AccountingEngine' do .NET.
- **Métodos:**
  - `def get_user_dashboard(db, tenant_id)`
    - *Ação:* Retorna visão geral financeira para o Tenant....
  - `def generate_monthly_invoice(db, tenant_id)`
    - *Ação:* Gera uma nova fatura (Draft) para o ciclo atual (Sprint 34)....


---

### 📄 Arquivo: `message_history_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, datetime.datetime, src.models.chat.Conversation, src.models.chat.Message, src.models.chat.MessageSide, src.models.chat.MessageStatus, src.core.tenancy.get_current_tenant_id, loguru.logger, typing.List, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `MessageHistoryService`
- **Descrição:** Serviço central de persistência de histórico de chat (Postgres).
Replica a lógica da camada de dados do ChatApp original.
- **Métodos:**
  - `def get_or_create_conversation(db, contact_phone)`
    - *Ação:* Sem docstring....
  - `def record_message(db, contact_phone, content, side, agent_id, msg_type, external_id, status, session_name)`
    - *Ação:* Salva uma mensagem no histórico (Postgres + MongoDB) e atualiza a última interação....
  - `def update_message_status(db, external_id, new_status)`
    - *Ação:* Atualiza o status de uma mensagem via ID externo (Provider)....
  - `def list_history(db, contact_phone, limit, offset)`
    - *Ação:* Sem docstring....
  - `def list_conversations(db, tenant_id, only_active, limit, offset)`
    - *Ação:* Retorna a lista paginada de todas as conversas do Tenant,
com contagens de mensagens não lidas e tot...
  - `def get_conversation_detail(db, tenant_id, conversation_id, limit, offset)`
    - *Ação:* Retorna a conversa com um contato específico, incluindo o histórico
de mensagens paginado e metadado...


---

### 📄 Arquivo: `message_normalizer.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.common.schemas.UnifiedMessage, src.common.schemas.ChannelType, src.common.schemas.UnifiedMessageType, src.schemas, datetime.datetime, loguru.logger, typing.Any, typing.Dict

**Classes Definidas:**
#### 🏛️ Classe: `MessageNormalizer`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def from_whatsapp(tenant_id, ws_message)`
    - *Ação:* Converte o payload bruto do WhatsApp (Venom/Evolution) para o formato unificado.
Replicando a lógica...


---

### 📄 Arquivo: `node_actions.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- httpx, typing.Any, typing.Dict, typing.List, typing.Optional, src.schemas.flow.FlowNode, src.schemas.flow.NodeType, src.common.schemas.UnifiedMessage, src.common.schemas.UnifiedMessageType, src.core.bus.rabbitmq_bus, src.services.condition_evaluator.ConditionEvaluator, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.database.SessionLocal, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `NodeActions`
- **Descrição:** Biblioteca de funções executoras para cada tipo de nó.
Replicando o comportamento de 'NodeHandlers' do .NET.
- **Métodos:**
  - `def execute_message_node(node, tenant_id, contact_phone, variables)`
    - *Ação:* Executa um nó de envio de mensagem e persiste no histórico....
  - `def execute_api_call_node(node, variables)`
    - *Ação:* Executa uma chamada HTTP para API externa (Sprint 19).
Similar ao IHttpClientFactory + Polly no .NET...
  - `def execute_handover_node(tenant_id, contact_phone)`
    - *Ação:* Transfere o atendimento para um humano (ChatService)....
  - `def execute_ai_node(node, tenant_id, contact_phone, variables, user_input)`
    - *Ação:* Executa um nó de IA usando o Google Gemini.
O system_prompt pode ser configurado no campo 'data' do ...


---

### 📄 Arquivo: `payment_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.billing.Plan, src.models.billing.Subscription, src.models.transaction.Transaction, datetime.datetime, datetime.timedelta, loguru.logger, typing.Dict, typing.Any, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `PaymentService`
- **Descrição:** Motor de Pagamentos e Webhooks Financeiros.
Replica o 'PaymentEngine' do .NET integrado com Mercado Pago/Stripe.
- **Métodos:**
  - `def generate_checkout(db, tenant_id, plan_id)`
    - *Ação:* Simula a geração de um link de pagamento (Stripe) ou Pix (Mercado Pago).
Substitui integrações de SD...
  - `def process_webhook(db, provider, payload)`
    - *Ação:* Processa notificações de pagamento (Webhooks).
Garante que a assinatura seja renovada se o pagamento...


---

### 📄 Arquivo: `quota_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.models.billing.Subscription, src.models.billing.Plan, src.core.redis.redis_client, sqlalchemy.orm.Session, datetime.datetime, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `QuotaService`
- **Descrição:** Gerenciador de limites e quotas (SaaS Governing).
Controla mensagens enviadas e instâncias de bots por Tenant.
Replica o 'ResourceGuard' do .NET.
- **Métodos:**
  - `def increment_message_usage(db, tenant_id)`
    - *Ação:* Incrementa o contador de mensagens enviadas no mês.
Retorna False se o limite do plano for atingido....
  - `def can_create_bot(db, tenant_id)`
    - *Ação:* Verifica se o Tenant ainda pode criar novas instâncias de bot....
  - `def can_create_agent(db, tenant_id)`
    - *Ação:* Verifica se o Tenant ainda pode criar novos usuários/agentes....


---

### 📄 Arquivo: `session_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, typing.Any, datetime.datetime, src.models.mongo.flow.SessionStateDocument, src.services.cache.CacheService, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `SessionService`
- **Descrição:** Gerencia o estado das conversas no MongoDB e Redis.
Replicando o SessionState Manager do .NET.
- **Métodos:**
  - `def get_or_create_session(tenant_id, contact_phone, flow_id)`
    - *Ação:* Sem docstring....
  - `def update_session(session)`
    - *Ação:* Persiste mudanças no estado no Mongo e invalida/atualiza Cache....
  - `def set_variable(session, key, value)`
    - *Ação:* Define uma variável na sessão do usuário....


---

### 📄 Arquivo: `storage_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- os, shutil, fastapi.UploadFile, typing.Optional, loguru.logger, uuid

**Classes Definidas:**
#### 🏛️ Classe: `StorageService`
- **Descrição:** Gerenciador de Arquivos e Mídias (Imagens, Áudios, PDFs).
Substitui o 'BlobStorageService' do .NET que usava Azure/S3.
- **Métodos:**
  - `def ensure_upload_dir()`
    - *Ação:* Sem docstring....
  - `def save_upload(file, tenant_id)`
    - *Ação:* Salva um arquivo enviado pelo UI (Agente) para o bot....
  - `def get_public_url(file_path)`
    - *Ação:* Retorna a URL pública para acesso externo (Bot/Venom)....


---

### 📄 Arquivo: `whatsapp_bridge_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- httpx, typing.Any, typing.Dict, typing.Optional, src.core.config.settings, src.models.whatsapp.WhatsAppStatus, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppBridgeService`
- **Descrição:** Controlador de comunicação com a Ponte Node.js (Venom-bot).
- **Métodos:**
  - `def __init__(self)`
    - *Ação:* Sem docstring....
  - `def create_session(self, session_id)`
    - *Ação:* Tenta criar uma nova sessão no Bridge (Venom)....
  - `def stop_instance(self, session_id)`
    - *Ação:* Para o processo do bot no Bridge....
  - `def restart_instance(self, session_id)`
    - *Ação:* Reinicia o processo do bot no Bridge....
  - `def fetch_status(self, session_id)`
    - *Ação:* Verifica o status da conexão da instância (Health Check)....
  - `def get_qrcode(self, session_id)`
    - *Ação:* Recupera o QR Code atualizado em formato base64....
  - `def logout(self, session_id)`
    - *Ação:* Desconecta a sessão do WhatsApp....
  - `def send_file(self, session_id, to, file_url, caption)`
    - *Ação:* Envia um arquivo via Bridge....
  - `def send_message(self, session_key, to, content)`
    - *Ação:* Envia uma mensagem de texto via Bridge....
  - `def add_contact(self, session_id, phone, name)`
    - *Ação:* Verifica se um número tem conta WhatsApp ativa e o valida como contato.
Utiliza o endpoint /contacts...
  - `def edit_contact(self, session_id, phone, name)`
    - *Ação:* Solicita ao Bridge a edição do nome do contato armazenado localmente....
  - `def delete_contact(self, session_id, phone)`
    - *Ação:* Solicita ao Bridge que delete o contato (e chat) visualmente na sessão....
  - `def list_contacts(self, session_id)`
    - *Ação:* Solicita ao Bridge a lista completa de contatos WhatsApp conhecidos pela sessão.
Utiliza o endpoint ...
  - `def list_chats(self, session_id)`
    - *Ação:* Solicita ao Bridge a lista completa de conversas (chats) do WhatsApp conectado.
Retorna diretamente ...
  - `def get_chat_history(self, session_id, jid, limit)`
    - *Ação:* Solicita ao Bridge o histórico de mensagens de uma conversa específica.
O JID deve estar no formato ...


---

### 📄 Arquivo: `whatsapp_manager_service.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, datetime.datetime, src.models.whatsapp.WhatsAppInstance, src.models.whatsapp.WhatsAppStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, src.core.tenancy.get_current_tenant_id, loguru.logger, typing.List, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppManagerService`
- **Descrição:** Controlador de Negócio para instâncias de WhatsApp no Tenant.
Substitui o 'BotOrchestrator' do .NET.
- **Métodos:**
  - `def get_or_create_instance(db, tenant_id)`
    - *Ação:* Recupera a instância configurada para o Tenant (a mais recente) ou cria uma inicial....
  - `def initialize_bot(db, tenant_id)`
    - *Ação:* Aciona o Bridge para iniciar bot. Sempre cria uma nova instância isolada garantindo re-auth limpo....
  - `def stop_bot(db, tenant_id)`
    - *Ação:* Para o bot no Bridge....
  - `def restart_bot(db, tenant_id)`
    - *Ação:* Reinicia o bot no Bridge....
  - `def sync_instance_status(db, inst)`
    - *Ação:* Sincroniza o estado de uma instância específica com o Bridge....
  - `def health_check_all(db)`
    - *Ação:* Tarefa periódica que sincroniza o estado global das instâncias.
Detecta sessões desconectadas e atua...


---

## 📁 Diretório: `workers`

### 📄 Arquivo: `ack_worker.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageStatus, src.core.database.SessionLocal, src.core.ws.ws_manager, src.schemas.whatsapp.WhatsAppAckStatus, loguru.logger, asyncio

**Classes Definidas:**
#### 🏛️ Classe: `AckWorker`
- **Descrição:** Worker que processa confirmações de recebimento (ACKs) de mensagens do provider.
Replicando o Serviço 'SaaS.Omnichannel.Services.AckTracker' do .NET.
- **Métodos:**
  - `def start(self)`
    - *Ação:* Sem docstring....
  - `def handle_message_ack(self, payload)`
    - *Ação:* Ponto de entrada para cada confirmação (READ, DELIVERED, etc)....


---

### 📄 Arquivo: `campaign_worker.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.core.database.SessionLocal, src.models.campaign.Campaign, src.models.campaign.CampaignContact, src.models.campaign.CampaignStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, loguru.logger, datetime.datetime, asyncio, random

**Classes Definidas:**
#### 🏛️ Classe: `CampaignWorker`
- **Descrição:** Worker que processa campanhas em segundo plano.
Replicando 'MassDisparadorTask' do .NET.
- **Métodos:**
  - `def start(self)`
    - *Ação:* Sem docstring....
  - `def process_campaign(self, payload)`
    - *Ação:* Processa o disparo massivo de uma campanha.
Controla delays, erros e status de cada contato....


---

### 📄 Arquivo: `flow_worker.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.services.flow_executor.FlowExecutor, src.models.mongo.flow.FlowDocument, src.services.session_service.SessionService, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.database.SessionLocal, src.core.ws.ws_manager, loguru.logger, json, asyncio

**Classes Definidas:**
#### 🏛️ Classe: `FlowWorker`
- **Descrição:** Worker que escuta mensagens do RabbitMQ e processa através da FlowEngine.
Replicando o Serviço 'SaaS.OmniChannelPlatform.Services.FlowEngine' do .NET.
- **Métodos:**
  - `def start(self)`
    - *Ação:* Sem docstring....
  - `def handle_incoming_message(self, payload)`
    - *Ação:* Ponto de entrada para processamento de cada mensagem....


---

### 📄 Arquivo: `outgoing_worker.py`
**Docstring do Módulo:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.database.SessionLocal, src.core.tenancy.set_current_tenant_id, src.models.whatsapp.WhatsAppInstance, src.models.whatsapp.WhatsAppStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, loguru.logger, asyncio

**Classes Definidas:**
#### 🏛️ Classe: `OutgoingMessageWorker`
- **Descrição:** Worker que consome a fila de mensagens de saída e efetiva o envio
via WhatsApp Bridge (Baileys).
- **Métodos:**
  - `def start(self)`
    - *Ação:* Sem docstring....
  - `def process_outgoing(self, payload)`
    - *Ação:* Processa o envio de uma mensagem para o WhatsApp.
Ex: {"tenant_id": "...", "to": "...", "content": "...


---

