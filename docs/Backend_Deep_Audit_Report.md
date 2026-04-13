# 🌌 Auditoria Estendida e Detalhada do Backend e Documentação

Este documento contém a análise abrangente e profunda de todos os scripts do backend (Python e Node.js) e de todos os arquivos Markdown presentes no projeto.

---
## 📚 1. Arquivos Markdown e Documentação


### 📍 Diretório: `.`

#### 📄 `agent_flow_integration_guide.md`
- **Título:** Bluebook: Guia de Integração Agente-Flow (v2.1)
- **Total de Linhas:** 141
- **Resumo/Início:** Este guia detalha a especificação técnica para a criação, orquestração e gestão de agentes através do motor de fluxos (**FlowEngine**) do SaaS Chatbot.

#### 📄 `API_INTEGRATION_GUIDE.md`
- **Título:** 🌐 Guia de Integração Profundo: Front-end & Microserviços
- **Total de Linhas:** 134
- **Resumo/Início:** Este guia expandido detalha a arquitetura, segurança e padrões de implementação para integrar um front-end moderno (Vue 3 / Next.js) com o ecossistema SaaS Chatbot.

#### 📄 `BACKEND_API_GUIDE.md`
- **Título:** Documentação Técnica: Back-end API & Ecossistema de Rotas 🚀
- **Total de Linhas:** 156
- **Resumo/Início:** Este guia descreve as ferramentas, microsserviços e rotas disponíveis no back-end da plataforma SaaS OmniChannel, detalhando como o Frontend deve se conectar e quais dados são necessários para cada op...

#### 📄 `FRONTEND_IMPLEMENTATION_GUIDE.md`
- **Título:** 💎 Guia de Implementação: Frontend Premium (Vue 3 + TypeScript)
- **Total de Linhas:** 121
- **Resumo/Início:** Este documento detalha a arquitetura, ferramentas, padrões de design e lógica de negócio implementados no novo ecossistema visual da plataforma **SaaS OmniChannel**.

#### 📄 `integration_guide.md`
- **Título:** Guia Definitivo de Integração: FastAPI Backend ↔ Vue.js Frontend
- **Total de Linhas:** 158
- **Resumo/Início:** Este documento serve como o manual técnico oficial para a integração entre o novo ecossistema **Python/FastAPI** e a interface **Vue.js (ChatUI)**. Ele detalha todas as rotas, protocolos de comunicaçã...

#### 📄 `MVP_FEATURES.md`
- **Título:** MVP - SaaS OmniChannel Platform 🧩
- **Total de Linhas:** 48
- **Resumo/Início:** Este documento descreve as funcionalidades essenciais para o **Mínimo Produto Viável (MVP)** da plataforma, focado em entregar valor real para Administradores, Revendas e Clientes Finais.

#### 📄 `MVP_ROADMAP.md`
- **Título:** Roadmap de Desenvolvimento - MVP 🗺️
- **Total de Linhas:** 62
- **Resumo/Início:** Este roadmap detalha as 7 Sprints necessárias para construir o MVP funcional da plataforma SaaS OmniChannel.

#### 📄 `README.md`
- **Título:** SaaS OmniChannel Platform 🚀
- **Total de Linhas:** 110
- **Resumo/Início:** [![.NET Core CI](https://github.com/LuckArkman/SaaS-Chatbot/actions/workflows/dotnet-ci.yml/badge.svg)](https://github.com/LuckArkman/SaaS-Chatbot/actions/workflows/dotnet-ci.yml)


### 📍 Diretório: `sprints`

#### 📄 `README.md`
- **Título:** Roadmap de Migração: .NET 8 para Python (FastAPI)
- **Total de Linhas:** 68
- **Resumo/Início:** Este documento serve como índice para as 45 sprints de migração da arquitetura backend do SaaS Chatbot.

#### 📄 `sprint_01_setup_python_base.md`
- **Título:** Sprint 01: Setup do Ambiente Base Python e CI/CD
- **Total de Linhas:** 38
- **Resumo/Início:** **Tema**: Inicialização do Ecossistema Python e Estrutura de Microserviços.

#### 📄 `sprint_02_identity_auth_migration.md`
- **Título:** Sprint 02: Migração do Core de Autenticação (JWT/Identity)
- **Total de Linhas:** 31
- **Resumo/Início:** **Tema**: Segurança e Controle de Acesso Baseado em Claims.

#### 📄 `sprint_03_tenancy_management.md`
- **Título:** Sprint 03: Implementação do Gerenciamento de Tenancy em Python
- **Total de Linhas:** 23
- **Resumo/Início:** **Tema**: Isolamento de Dados e Multi-tenancy (SaaS).

#### 📄 `sprint_04_identity_registration_flow.md`
- **Título:** Sprint 04: API de Registro e Recuperação de Senha
- **Total de Linhas:** 21
- **Resumo/Início:** **Tema**: Fluxos de Onboarding e Self-Service de Identidade.

#### 📄 `sprint_05_identity_validation.md`
- **Título:** Sprint 05: Testes de Integração e Validação de Segurança Identity
- **Total de Linhas:** 20
- **Resumo/Início:** **Tema**: QA e Hardening da Base de Identidade.

#### 📄 `sprint_06_error_handling_middleware.md`
- **Título:** Sprint 06: Desenvolvimento do Middleware de Tratamento de Erros
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Estabilidade e Resiliência Global.

#### 📄 `sprint_07_redis_connectivity_core.md`
- **Título:** Sprint 07: Core de Conectividade Redis e Caching
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Performance e Estado Compartilhado.

#### 📄 `sprint_08_rabbitmq_service_bus.md`
- **Título:** Sprint 08: Abstração de RabbitMQ (Service Bus) em Python
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Arquitetura Event-Driven.

#### 📄 `sprint_09_logging_telemetry.md`
- **Título:** Sprint 09: Logger Centralizado e Telemetria
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Observabilidade.

#### 📄 `sprint_10_dto_validation_schemas.md`
- **Título:** Sprint 10: Validação de DTOs com Pydantic e Schemas Base
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Integridade de Dados.

#### 📄 `sprint_11_channel_gateway_core.md`
- **Título:** Sprint 11: Migração do Channel Gateway (Core)
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Gateway de Entrada de Dados.

#### 📄 `sprint_12_whatsapp_webhooks.md`
- **Título:** Sprint 12: Webhooks de Integração para WhatsApp
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Conectividade com Provider.

#### 📄 `sprint_13_message_normalization.md`
- **Título:** Sprint 13: Filtros de Mensagens e Normalização de Payload
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Normalização de Dados.

#### 📄 `sprint_14_websocket_bridge.md`
- **Título:** Sprint 14: WebSocket Bridge para Comunicação UI
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Real-time Feed.

#### 📄 `sprint_15_gateway_load_test.md`
- **Título:** Sprint 15: Testes de Stress do Gateway
- **Total de Linhas:** 16
- **Resumo/Início:** **Tema**: Estabilidade sob Carga.

#### 📄 `sprint_16_flow_node_parsing.md`
- **Título:** Sprint 16: Migração da Lógica de Parsing de Nós do FlowBuilder
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Inteligência de Execução.

#### 📄 `sprint_17_mongodb_persistence_flow.md`
- **Título:** Sprint 17: Persistência de Fluxos no MongoDB (Python Beanie)
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Bancos Não-Relacionais.

#### 📄 `sprint_18_condition_interpreter.md`
- **Título:** Sprint 18: Interpretador de Condições e Variáveis de Sessão
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Lógica Dinâmica.

#### 📄 `sprint_19_async_node_execution.md`
- **Título:** Sprint 19: Execução Assíncrona de Nodes e Callbacks
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Execução de Fluxo.

#### 📄 `sprint_20_flow_management_api.md`
- **Título:** Sprint 20: APIs de Gerenciamento de Fluxos
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Backend Management.

#### 📄 `sprint_21_chat_service_core.md`
- **Título:** Sprint 21: Serviço de Chat em Tempo Real (FastAPI WebSockets)
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Comunicação Instantânea.

#### 📄 `sprint_22_message_history.md`
- **Título:** Sprint 22: Histórico de Mensagens e Persistência de Conversas
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Dados Históricos.

#### 📄 `sprint_23_message_status_tracking.md`
- **Título:** Sprint 23: Status de Mensagens (Enviado/Lido/Erro)
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Rastreamento e Confiabilidade.

#### 📄 `sprint_24_agent_assignment_logic.md`
- **Título:** Sprint 24: Atribuição Automática de Agentes
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Regras de Negócio.

#### 📄 `sprint_25_support_queues.md`
- **Título:** Sprint 25: Filas de Atendimento e Distribuição
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Experiência do Cliente.

#### 📄 `sprint_26_venom_bridge_control.md`
- **Título:** Sprint 26: Wrapper de Controle para Instâncias Venom/Node Bridge
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Integração Híbrida.

#### 📄 `sprint_27_qr_code_management.md`
- **Título:** Sprint 27: Gerenciamento de QR Code via API Python
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Autenticação de Canal.

#### 📄 `sprint_28_bot_event_listeners.md`
- **Título:** Sprint 28: Bot Event Listeners
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Callbacks de canal.

#### 📄 `sprint_29_bot_resiliency.md`
- **Título:** Sprint 29: Lógica de Auto-reconexão e Heartbeat
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Resiliência e Disponibilidade.

#### 📄 `sprint_30_media_handling.md`
- **Título:** Sprint 30: Envio de Mídias e Arquivos (Python/FastAPI Storage)
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Multimídia.

#### 📄 `sprint_31_billing_plans_core.md`
- **Título:** Sprint 31: Core de Precificação e Planos
- **Total de Linhas:** 20
- **Resumo/Início:** **Tema**: Monetização.

#### 📄 `sprint_32_payment_gateways.md`
- **Título:** Sprint 32: Integração com Gateway de Pagamento (Webhooks)
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Fintech/Pagamentos.

#### 📄 `sprint_33_usage_limits_control.md`
- **Título:** Sprint 33: Controle de Limites de Uso por Tenant
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Governança de Recursos.

#### 📄 `sprint_34_invoicing_system.md`
- **Título:** Sprint 34: Geração de Faturas e Dashboards Financeiros
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Reporting Financeiro.

#### 📄 `sprint_35_billing_notifications.md`
- **Título:** Sprint 35: Notificações de Vencimento e Renovação
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Retenção e CRM.

#### 📄 `sprint_36_campaign_scheduler.md`
- **Título:** Sprint 36: Agendador de Campanhas em Lote (Celery/Redis)
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Mass Mailing / Automação de Massa.

#### 📄 `sprint_37_contact_import_segmentation.md`
- **Título:** Sprint 37: Importação de Contatos e Listas de Segmentação
- **Total de Linhas:** 20
- **Resumo/Início:** **Tema**: Gestão de Leads.

#### 📄 `sprint_38_anti_ban_delays.md`
- **Título:** Sprint 38: Lógica de Rate Limiting para Evitar Banimento (Delay)
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Inteligência Antibloqueio.

#### 📄 `sprint_39_campaign_analytics.md`
- **Título:** Sprint 39: Relatórios de Conversão e Desempenho de Campanha
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Analytics.

#### 📄 `sprint_40_ab_testing_automation.md`
- **Título:** Sprint 40: AB-Testing para Fluxos de Automação
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Otimização.

#### 📄 `sprint_41_admin_dashboards_python.md`
- **Título:** Sprint 41: Dashboards Administrativos (AdminDashboards Migration)
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Gestão Global.

#### 📄 `sprint_42_frontend_api_sync.md`
- **Título:** Sprint 42: Integração Final Frontend (ChatUI) com APIs Python
- **Total de Linhas:** 20
- **Resumo/Início:** **Tema**: Frontend Sync.

#### 📄 `sprint_43_performance_tuning.md`
- **Título:** Sprint 43: Otimização de Performance e Profiling
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Polimento Técnico.

#### 📄 `sprint_44_final_docs_openapi.md`
- **Título:** Sprint 44: Documentação Final e OpenAPI (Swagger) Patterns
- **Total de Linhas:** 19
- **Resumo/Início:** **Tema**: Manutenibilidade.

#### 📄 `sprint_45_production_deploy_pm2.md`
- **Título:** Sprint 45: Deploy Final em Produção via PM2 / Nginx Reverse Proxy
- **Total de Linhas:** 18
- **Resumo/Início:** **Tema**: Go-Live.


### 📍 Diretório: `docs`

#### 📄 `Analise_Minuciosa_SaaS_Chatbot.md`
- **Título:** 🌌 Análise Profunda, Vasta e Detalhada - SaaS Chatbot Backend
- **Total de Linhas:** 1281
- **Resumo/Início:** Esta documentação compreende a **análise mais minuciosa e rica** do ecossistema backend e das documentações que compõem o SaaS Chatbot. Cada camada, serviço, controller e fluxo foi esmiuçado.

#### 📄 `backend_analysis.md`
- **Título:** 🌌 Análise Profunda e Vasta do Backend do Projeto SaaS Chatbot
- **Total de Linhas:** 1860
- **Resumo/Início:** Esta documentação compreende uma análise extensa, exaustiva e detalhada de **todos** os scripts pertencentes ao backend da plataforma SaaS Chatbot.

#### 📄 `backend_deep_analysis.md`
- **Título:** 🪐 SaaS-Chatbot: Deep Backend Technical Analysis
- **Total de Linhas:** 128
- **Resumo/Início:** This document provides a comprehensive, vast, and deeply detailed architectural analysis of the **SaaS-Chatbot** backend. It explores every layer of the system—from infrastructure and data persistence...

#### 📄 `put_route_analysis.md`
- **Título:** Análise Minuciosa de Propagação (PUT /whatsapp/{phone})
- **Total de Linhas:** 67
- **Resumo/Início:** Abaixo encontra-se a análise ponto a ponto de **todo o trajeto de comunicação** da rota que deveria atualizar os dados do contato. O documento destrincha o porquê da informação falhar ao atingir o ban...


---
## ⚙️ 2. Análise Estrutural do Backend (Python - API)


### 📁 Camada: `src`

### 📄 Arquivo: `main.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.FastAPI, fastapi.middleware.cors.CORSMiddleware, src.core.config.settings, src.api.v1.api.api_router, src.core.middlewares.TenancyMiddleware, src.common.error_handlers.register_error_handlers, src.core.redis.redis_client, src.core.bus.rabbitmq_bus, src.core.bridge.start_websocket_bridge, src.core.logging.setup_logging, src.common.logging_middleware.LoggingMiddleware, motor.motor_asyncio.AsyncIOMotorClient, beanie.init_beanie, src.models.mongo.flow.FlowDocument, src.models.mongo.flow.SessionStateDocument, src.workers.flow_worker.flow_worker, src.workers.ack_worker.ack_worker, src.workers.outgoing_worker.outgoing_worker, src.services.whatsapp_manager_service.WhatsAppManagerService, src.core.database.SessionLocal, src.core.database.engine, src.core.database.Base, loguru.logger, asyncio, src.models.user, src.models.chat, src.models.whatsapp, src.models.whatsapp_events, src.models.billing, src.models.campaign, src.models.contact, src.models.department, src.models.invoice, src.models.transaction, fastapi.staticfiles.StaticFiles, src.services.storage_service.StorageService

**Funções Globais:**
- `def create_application(...) -> ...`
  - *Descrição:* Equivalente ao Program.cs / CreateBuilder no .NET



---


### 📁 Camada: `src\api`

### 📄 Arquivo: `deps.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Generator, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.security.OAuth2PasswordBearer, jose.jwt, pydantic.ValidationError, sqlalchemy.orm.Session, src.core.security, src.core.config.settings, src.core.database.get_db, src.models.user.User, src.schemas.user.TokenPayload

**Funções Globais:**
- `def get_current_user(...) -> ...`
  - *Descrição:* Sem docstring.
- `def get_current_active_user(...) -> ...`
  - *Descrição:* Sem docstring.
- `def get_current_active_superuser(...) -> ...`
  - *Descrição:* Sem docstring.



---


### 📁 Camada: `src\api\v1`

### 📄 Arquivo: `api.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.APIRouter, src.api.v1.endpoints.auth, src.api.v1.endpoints.gateway, src.api.v1.endpoints.ws, src.api.v1.endpoints.flows, src.api.v1.endpoints.chat, src.api.v1.endpoints.bot, src.api.v1.endpoints.billing, src.api.v1.endpoints.campaigns, src.api.v1.endpoints.contacts, src.api.v1.endpoints.admin


---


### 📁 Camada: `src\api\v1\endpoints`

### 📄 Arquivo: `admin.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, typing.Dict, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.api.deps, src.core.database.get_db, src.models.billing.Subscription, src.models.billing.Plan, src.models.transaction.Transaction, src.models.whatsapp.WhatsAppInstance, loguru.logger, sqlalchemy.func

**Funções Globais:**
- `def get_global_summary(...) -> ...`
  - *Descrição:* Visão geral global para SuperAdmins (Sprint 41).
- `def list_all_transactions(...) -> ...`
  - *Descrição:* Lista todas as transações financeiras da plataforma.
- `def toggle_maintenance_mode(...) -> ...`
  - *Descrição:* Simula a ativação do modo de manutenção global.



---

### 📄 Arquivo: `auth.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.security.OAuth2PasswordRequestForm, sqlalchemy.orm.Session, datetime.datetime, datetime.timedelta, src.models, src.schemas, src.api.deps, src.core.security, src.core.validators, src.core.config.settings, src.core.database.get_db, loguru.logger, uuid

**Funções Globais:**
- `def login_access_token(...) -> ...`
  - *Descrição:* OAuth2 compatible token login, get an access token for future requests
- `def register_user(...) -> ...`
  - *Descrição:* Registra um novo usuário e cria um novo Tenant associado.
- `def recover_password(...) -> ...`
  - *Descrição:* Password Recovery Logic (Stub)
- `def reset_password(...) -> ...`
  - *Descrição:* Reseta a senha usando um token válido.
- `def change_password(...) -> ...`
  - *Descrição:* Altera a senha do usuário logado.
- `def read_user_me(...) -> ...`
  - *Descrição:* Get current user.



---

### 📄 Arquivo: `billing.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.services.billing_service.BillingService, src.services.payment_service.PaymentService, src.services.invoicing_service.InvoicingService, src.schemas.billing.PlanOut, src.schemas.billing.SubscriptionOut, src.api.deps, src.core.database.get_db, src.core.tenancy.get_current_tenant_id, loguru.logger

**Funções Globais:**
- `def list_public_plans(...) -> ...`
  - *Descrição:* Lista todos os planos disponíveis para assinatura.
Replica o endpoint 'Pricing/Plans' do .NET.
- `def get_my_subscription(...) -> ...`
  - *Descrição:* Busca os detalhes da assinatura atual do Tenant ativo.
- `def subscribe_to_plan(...) -> ...`
  - *Descrição:* Inicia uma nova assinatura para o Tenant.
No futuro, isto integrará com Stripe/PagSeguro (Sprint 32).
- `def get_financial_dashboard(...) -> ...`
  - *Descrição:* Retorna o painel financeiro consolidado do Tenant (Sprint 34).



---

### 📄 Arquivo: `bot.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.Header, sqlalchemy.orm.Session, src.schemas, src.api.deps, src.services.whatsapp_manager_service.WhatsAppManagerService, src.core.database.get_db, src.core.tenancy.get_current_tenant_id, loguru.logger


---

### 📄 Arquivo: `campaigns.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.services.campaign_service.CampaignService, src.schemas.campaign.CampaignCreate, src.schemas.campaign.CampaignOut, src.api.deps, src.core.database.get_db, src.core.tenancy.get_current_tenant_id, src.models.campaign.Campaign, src.models.campaign.CampaignStatus, loguru.logger

**Funções Globais:**
- `def list_campaigns(...) -> ...`
  - *Descrição:* Busca as campanhas ativas do Tenant.
- `def create_campaign(...) -> ...`
  - *Descrição:* Cria um rascunho de campanha.



---

### 📄 Arquivo: `chat.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.Dict, typing.List, typing.Optional, fastapi.APIRouter, fastapi.Depends, fastapi.Query, fastapi.status, fastapi.HTTPException, sqlalchemy.orm.Session, src.services.chat_service.ChatService, src.services.agent_assignment_service.AgentAssignmentService, src.services.message_history_service.MessageHistoryService, src.core.ws.ws_manager, src.schemas.chat.MessageOut, src.schemas.chat.ConversationListResponse, src.schemas.chat.ConversationDetailResponse, src.api.deps, src.core.database.get_db, src.core.tenancy.get_current_tenant_id, loguru.logger


---

### 📄 Arquivo: `contacts.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, typing.Dict, typing.Optional, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.UploadFile, fastapi.File, sqlalchemy.orm.Session, src.services.contact_service.ContactService, src.services.whatsapp_bridge_service.whatsapp_bridge, src.services.whatsapp_manager_service.WhatsAppManagerService, src.schemas.contact.ContactCreate, src.schemas.contact.ContactOut, src.schemas.contact.TagOut, src.schemas.contact.WhatsAppContactAdd, src.schemas.contact.WhatsAppContactUpdate, src.schemas.contact.WhatsAppContactAddOut, src.schemas.contact.WhatsAppContactListOut, src.schemas.contact.WhatsAppContactVerified, src.api.deps, src.core.database.get_db, src.core.tenancy.get_current_tenant_id, src.models.contact.Contact, src.models.contact.Tag, src.models.whatsapp.WhatsAppStatus, loguru.logger, re

**Funções Globais:**
- `def set_opt_out(...) -> ...`
  - *Descrição:* Ativa o Opt-out para um contato específico.
- `def list_tags(...) -> ...`
  - *Descrição:* Sem docstring.



---

### 📄 Arquivo: `flows.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, src.models.mongo.flow.FlowDocument, src.schemas.flow.FlowCreate, src.schemas.flow.FlowUpdate, src.api.deps, src.core.tenancy.get_current_tenant_id, loguru.logger, beanie.PydanticObjectId


---

### 📄 Arquivo: `gateway.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, fastapi.APIRouter, fastapi.Depends, fastapi.Header, fastapi.HTTPException, fastapi.status, src.schemas, src.schemas.whatsapp.WhatsAppPayload, src.schemas.whatsapp.WhatsAppMessageEvent, src.schemas.whatsapp.WhatsAppAckStatus, src.services.message_normalizer.MessageNormalizer, src.core.bus.rabbitmq_bus, src.core.tenancy.get_current_tenant_id, src.core.tenancy.set_current_tenant_id, src.core.database.SessionLocal, loguru.logger, json, src.services.chat_service.chat_service, src.models.mongo.chat.MessageSource, fastapi.Request

**Funções Globais:**
- `def verify_gateway_key(...) -> ...`
  - *Descrição:* Sem docstring.
- `def normalize_webhook_payload(...) -> ...`
  - *Descrição:* Normaliza o payload recebido para o formato esperado por WhatsAppPayload.

Aceita múltiplos formatos:
- Formato canônico do Bridge Baileys:  {event, session, payload}
- Formato do painel UTalk/simulador:   {event, data, tenant_id, ...}
- Formato raw Baileys 6.x on_message:  {event: "messages.upsert", data: {...}}

Retorna sempre: {event (enum value), session (str), payload (dict)}.



---

### 📄 Arquivo: `ws.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.APIRouter, fastapi.WebSocket, fastapi.WebSocketDisconnect, fastapi.Query, fastapi.Depends, src.core.ws.ws_manager, src.api.deps, src.core.security, loguru.logger, json


---


### 📁 Camada: `src\common`

### 📄 Arquivo: `error_handlers.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.Request, fastapi.FastAPI, fastapi.responses.JSONResponse, fastapi.exceptions.RequestValidationError, src.common.exceptions.AppException, loguru.logger, traceback, fastapi.encoders.jsonable_encoder

**Funções Globais:**
- `def register_error_handlers(...) -> ...`
  - *Descrição:* Sem docstring.



---

### 📄 Arquivo: `exceptions.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.Dict, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `AppException`
- **Herda de:** `Exception`
- **Descrição:** Base exception for the application.
- **Métodos:**
  - `def __init__(...):`
#### 🏛️ Classe: `ValidationException`
- **Herda de:** `AppException`
- **Descrição:** Exception for validation errors (400).
- **Métodos:**
  - `def __init__(...):`
#### 🏛️ Classe: `NotFoundException`
- **Herda de:** `AppException`
- **Descrição:** Exception when a resource is not found (404).
- **Métodos:**
  - `def __init__(...):`
#### 🏛️ Classe: `UnauthorizedException`
- **Herda de:** `AppException`
- **Descrição:** Exception for auth failures (401).
- **Métodos:**
  - `def __init__(...):`
#### 🏛️ Classe: `ForbiddenException`
- **Herda de:** `AppException`
- **Descrição:** Exception for permission failures (403).
- **Métodos:**
  - `def __init__(...):`



---

### 📄 Arquivo: `logging_middleware.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.Request, uuid, time, loguru.logger, starlette.middleware.base.BaseHTTPMiddleware, src.core.tenancy.get_current_tenant_id

**Classes Definidas:**
#### 🏛️ Classe: `LoggingMiddleware`
- **Herda de:** `BaseHTTPMiddleware`
- **Descrição:** Sem docstring.



---

### 📄 Arquivo: `schemas.py`
**Docstring:**
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
  - `def sanitize_content(...):`



---


### 📁 Camada: `src\core`

### 📄 Arquivo: `bridge.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.ws.ws_manager, loguru.logger, json, asyncio


---

### 📄 Arquivo: `bus.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- aio_pika, json, src.core.config.settings, loguru.logger, typing.Any, typing.Callable, typing.Awaitable

**Classes Definidas:**
#### 🏛️ Classe: `RabbitMQBus`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def __init__(...):`



---

### 📄 Arquivo: `config.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- os, pydantic_settings.BaseSettings, pydantic_settings.SettingsConfigDict, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `Settings`
- **Herda de:** `BaseSettings`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def DATABASE_URL(...):`



---

### 📄 Arquivo: `database.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.create_engine, sqlalchemy.ext.declarative.declarative_base, sqlalchemy.orm.sessionmaker, src.core.config.settings

**Funções Globais:**
- `def get_db(...) -> ...`
  - *Descrição:* Sem docstring.



---

### 📄 Arquivo: `logging.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sys, loguru.logger, src.core.config.settings

**Funções Globais:**
- `def setup_logging(...) -> ...`
  - *Descrição:* Sem docstring.



---

### 📄 Arquivo: `middlewares.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- fastapi.Request, fastapi.status, fastapi.responses.JSONResponse, starlette.middleware.base.BaseHTTPMiddleware, src.core.tenancy.set_current_tenant_id, src.core.security.ALGORITHM, src.core.config.settings, src.core.database.SessionLocal, src.services.billing_service.BillingService, jose.jwt, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `TenancyMiddleware`
- **Herda de:** `BaseHTTPMiddleware`
- **Descrição:** Sem docstring.



---

### 📄 Arquivo: `multi_tenancy.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.String, sqlalchemy.event, sqlalchemy.orm.Session, sqlalchemy.orm.with_loader_criteria, src.core.tenancy.get_current_tenant_id

**Classes Definidas:**
#### 🏛️ Classe: `MultiTenantMixin`
- **Descrição:** Mixin para adicionar isolamento de Tenant às entidades.


**Funções Globais:**
- `def _add_tenant_filter(...) -> ...`
  - *Descrição:* Injeta automaticamente o filtro 'WHERE tenant_id = ...' em todas as queries
de modelos que herdam de MultiTenantMixin.
Equivalente ao Global Query Filter do EF Core.
- `def tenant_persistence_hook(...) -> ...`
  - *Descrição:* Garante que o tenant_id seja injetado no objeto antes de ser persistido.



---

### 📄 Arquivo: `redis.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- redis.asyncio, src.core.config.settings, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `RedisClient`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def __init__(...):`



---

### 📄 Arquivo: `security.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- datetime.datetime, datetime.timedelta, typing.Any, typing.Union, jose.jwt, passlib.context.CryptContext, src.core.config.settings

**Funções Globais:**
- `def create_access_token(...) -> ...`
  - *Descrição:* Sem docstring.
- `def verify_password(...) -> ...`
  - *Descrição:* Sem docstring.
- `def get_password_hash(...) -> ...`
  - *Descrição:* Sem docstring.



---

### 📄 Arquivo: `tenancy.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- contextvars.ContextVar, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `TenantContextError`
- **Herda de:** `Exception`
- **Descrição:** Erro lançado quando o Tenant ID não é encontrado no contexto quando obrigatório.


**Funções Globais:**
- `def get_current_tenant_id(...) -> ...`
  - *Descrição:* Retorna o Tenant ID do contexto atual.
- `def set_current_tenant_id(...) -> ...`
  - *Descrição:* Define o Tenant ID no contexto da requisição atual.



---

### 📄 Arquivo: `validators.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- re, fastapi.HTTPException, fastapi.status

**Funções Globais:**
- `def validate_password_complexity(...) -> ...`
  - *Descrição:* Replicando regras do IdentityOptions do .NET:
- Mínimo 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos uma letra minúscula
- Pelo menos um número
- Pelo menos um caractere especial



---

### 📄 Arquivo: `ws.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Dict, typing.List, fastapi.WebSocket, src.core.redis.redis_client, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `ConnectionManager`
- **Descrição:** Gerencia as conexões WebSocket ativas, agrupadas por Tenant e Usuário.
Replica a lógica de Hubs do SignalR no .NET.
- **Métodos:**
  - `def __init__(...):`



---


### 📁 Camada: `src\models`

### 📄 Arquivo: `billing.py`
**Docstring:**
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
**Docstring:**
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
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.ForeignKey, sqlalchemy.Text, sqlalchemy.Enum, sqlalchemy.event, sqlalchemy.Index, sqlalchemy.orm.relationship, datetime.datetime, enum, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook

**Classes Definidas:**
#### 🏛️ Classe: `MessageSide`
- **Herda de:** `str`
- **Descrição:** Sem docstring.
#### 🏛️ Classe: `MessageStatus`
- **Herda de:** `str`
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
**Docstring:**
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
**Docstring:**
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
**Docstring:**
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
**Docstring:**
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
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Boolean, sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.DateTime, sqlalchemy.orm.relationship, datetime.datetime, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin

**Classes Definidas:**
#### 🏛️ Classe: `User`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Sem docstring.



---

### 📄 Arquivo: `whatsapp.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.Enum, sqlalchemy.event, datetime.datetime, enum, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppStatus`
- **Herda de:** `str`
- **Descrição:** Sem docstring.
#### 🏛️ Classe: `WhatsAppInstance`
- **Herda de:** `Base, MultiTenantMixin`
- **Descrição:** Representação persistente de uma instância do WhatsApp (Venom Session).
Replaces the 'BotInstance' C# entity from .NET.



---

### 📄 Arquivo: `whatsapp_events.py`
**Docstring:**
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


### 📁 Camada: `src\models\mongo`

### 📄 Arquivo: `chat.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, typing.List, datetime.datetime, beanie.Document, beanie.Indexed, beanie.PydanticObjectId, pydantic.Field, enum

**Classes Definidas:**
#### 🏛️ Classe: `MessageSource`
- **Herda de:** `str`
- **Descrição:** Sem docstring.
#### 🏛️ Classe: `MessageDocument`
- **Herda de:** `Document`
- **Descrição:** Persistência completa de cada interação no SaaS (Sprint 40).
Permite restaurar o histórico completo após sincronização do WhatsApp.



---

### 📄 Arquivo: `flow.py`
**Docstring:**
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


### 📁 Camada: `src\schemas`

### 📄 Arquivo: `base.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Generic, typing.TypeVar, typing.List, typing.Optional, typing.Any, pydantic.BaseModel

**Classes Definidas:**
#### 🏛️ Classe: `BaseResponse`
- **Herda de:** `BaseModel`
- **Descrição:** Wrapper padrão para respostas da API.
#### 🏛️ Classe: `PagedResponse`
- **Herda de:** `BaseModel`
- **Descrição:** Wrapper para listas paginadas.
#### 🏛️ Classe: `ErrorDetail`
- **Herda de:** `BaseModel`
- **Descrição:** Estrutura detalhada de erro.
#### 🏛️ Classe: `ErrorResponse`
- **Herda de:** `BaseModel`
- **Descrição:** Resposta padrão de erro.



---

### 📄 Arquivo: `billing.py`
**Docstring:**
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
**Docstring:**
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
**Docstring:**
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
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- re, typing.Annotated, pydantic.AfterValidator

**Funções Globais:**
- `def validate_whatsapp_phone(...) -> ...`
  - *Descrição:* Validador customizado para garantir formato internacional de telefone.



---

### 📄 Arquivo: `contact.py`
**Docstring:**
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
  - `def phone_must_have_digits(...):`
#### 🏛️ Classe: `WhatsAppContactUpdate`
- **Herda de:** `BaseModel`
- **Descrição:** Payload para atualizar contato sem obrigatoriedade do telefone no body.
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
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, pydantic.BaseModel, pydantic.Field

**Classes Definidas:**
#### 🏛️ Classe: `FilterParams`
- **Herda de:** `BaseModel`
- **Descrição:** Parâmetros base para filtragem, ordenação e paginação.
Inspirado nos padrões OData/REST do .NET.
- **Métodos:**
  - `def skip(...):`



---

### 📄 Arquivo: `flow.py`
**Docstring:**
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
  - `def validate_data(...):`
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
**Docstring:**
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
**Docstring:**
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
**Docstring:**
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


### 📁 Camada: `src\services`

### 📄 Arquivo: `agent_assignment_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.user.User, src.models.chat.Conversation, src.core.redis.redis_client, loguru.logger, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `AgentAssignmentService`
- **Descrição:** Motor de distribuição automática de chats (Round-Robin).
Substitui a lógica de 'AgentDispatch' do .NET.
- **Métodos:**
  - `def transfer_chat(...):`



---

### 📄 Arquivo: `billing_notification_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.billing.Subscription, src.services.invoicing_service.InvoicingService, datetime.datetime, datetime.timedelta, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `BillingNotificationService`
- **Descrição:** Controlador de Retenção e Alertas de Faturamento.
Replica o 'SubscriptionGuard' do .NET.



---

### 📄 Arquivo: `billing_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.billing.Plan, src.models.billing.Subscription, loguru.logger, typing.List, typing.Optional, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `BillingService`
- **Descrição:** Gerenciador de faturamento e assinaturas.
Replica a lógica de 'BillingEngine' do .NET.
- **Métodos:**
  - `def list_public_plans(...):`
  - `def get_tenant_subscription(...):`
  - `def check_plan_validity(...):`
  - `def assign_default_plan(...):`



---

### 📄 Arquivo: `cache.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- json, typing.Any, typing.Optional, src.core.redis.redis_client

**Classes Definidas:**
#### 🏛️ Classe: `CacheService`
- **Descrição:** Sem docstring.



---

### 📄 Arquivo: `campaign_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.campaign.Campaign, src.models.campaign.CampaignContact, src.models.campaign.CampaignStatus, loguru.logger, typing.List, typing.Optional, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `CampaignService`
- **Descrição:** Controlador de campanhas e disparos em massa.
Replicando 'BroadcastingService' do .NET.
- **Métodos:**
  - `def create_campaign(...):`
  - `def add_contacts(...):`



---

### 📄 Arquivo: `chat_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.List, typing.Optional, typing.Any, typing.Dict, datetime.datetime, src.models.mongo.chat.MessageDocument, src.models.mongo.chat.MessageSource, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.bus.rabbitmq_bus, src.core.redis.redis_client, src.core.ws.ws_manager, sqlalchemy.orm.Session, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `ChatService`
- **Descrição:** Serviço Unificado de Chat (Postgres + MongoDB).
Controla interações em tempo real (Sprint 21) e Persistência de Histórico (Sprint 40).
- **Métodos:**
  - `def normalize_phone(...):`



---

### 📄 Arquivo: `condition_evaluator.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- re, typing.Any, typing.Dict, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `ConditionEvaluator`
- **Descrição:** Avalia expressões lógicas simples baseadas em variáveis de sessão.
Suporta formatos como: {{variable_name}} == "value", {{count}} > 5, etc.
Replicando a lógica de condições do FlowBuilder original.
- **Métodos:**
  - `def evaluate(...):`
  - `def inject_variables(...):`



---

### 📄 Arquivo: `contact_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.contact.Contact, src.models.contact.Tag, loguru.logger, typing.List, typing.Dict, typing.Any, typing.Optional, io, csv

**Classes Definidas:**
#### 🏛️ Classe: `ContactService`
- **Descrição:** Motor de Importação e Segmentação de Leads.
Replica o 'LeadImporterService' do .NET.
- **Métodos:**
  - `def normalize_phone(...):`
  - `def import_csv(...):`
  - `def get_contacts_by_tags(...):`
  - `def set_blacklist(...):`



---

### 📄 Arquivo: `flow_executor.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Any, typing.Dict, typing.List, typing.Optional, src.schemas.flow.FlowDefinition, src.schemas.flow.FlowNode, src.schemas.flow.NodeType, src.models.mongo.flow.SessionStateDocument, src.services.flow_interpreter.FlowGraph, src.services.node_actions.NodeActions, src.services.session_service.SessionService, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `FlowExecutor`
- **Descrição:** Motor Principal de Execução de Fluxo.
Responsável por transitar entre nodes e disparar as ações corretas.
Replicando o motor central do FlowEngine C#.
- **Métodos:**
  - `def __init__(...):`



---

### 📄 Arquivo: `flow_interpreter.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.List, typing.Dict, typing.Optional, typing.Any, src.schemas.flow.FlowDefinition, src.schemas.flow.FlowNode, src.schemas.flow.FlowEdge, src.schemas.flow.NodeType, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `FlowGraph`
- **Descrição:** Representação em Grafo de um Fluxo de Automação para rápida travessia.
Replica a lógica da engine C# do FlowBuilder original.
- **Métodos:**
  - `def __init__(...):`
  - `def find_start_node(...):`
  - `def get_next_node(...):`
  - `def validate_flow(...):`



---

### 📄 Arquivo: `gemini_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- httpx, typing.List, typing.Dict, typing.Optional, src.core.config.settings, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `GeminiService`
- **Descrição:** Serviço de integração com o Google Gemma 3 12B via Google AI Studio API.
Suporta histórico de conversa multi-turn para respostas contextuais.
- **Métodos:**
  - `def _api_url(...):`
  - `def build_history_from_messages(...):`



---

### 📄 Arquivo: `invoicing_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.invoice.Invoice, src.models.billing.Subscription, src.models.billing.Plan, src.models.transaction.Transaction, datetime.datetime, datetime.timedelta, loguru.logger, typing.List, typing.Dict, typing.Any, uuid

**Classes Definidas:**
#### 🏛️ Classe: `InvoicingService`
- **Descrição:** Gerador de Faturas e Dashboards Financeiros.
Replica a lógica de 'AccountingEngine' do .NET.
- **Métodos:**
  - `def get_user_dashboard(...):`
  - `def generate_monthly_invoice(...):`



---

### 📄 Arquivo: `message_history_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, datetime.datetime, src.models.chat.Conversation, src.models.chat.Message, src.models.chat.MessageSide, src.models.chat.MessageStatus, src.core.tenancy.get_current_tenant_id, loguru.logger, typing.List, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `MessageHistoryService`
- **Descrição:** Serviço central de persistência de histórico de chat (Postgres).
Replica a lógica da camada de dados do ChatApp original.
- **Métodos:**
  - `def get_or_create_conversation(...):`
  - `def update_message_status(...):`
  - `def list_history(...):`
  - `def list_conversations(...):`
  - `def get_conversation_detail(...):`



---

### 📄 Arquivo: `message_normalizer.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.common.schemas.UnifiedMessage, src.common.schemas.ChannelType, src.common.schemas.UnifiedMessageType, src.schemas, datetime.datetime, loguru.logger, typing.Any, typing.Dict

**Classes Definidas:**
#### 🏛️ Classe: `MessageNormalizer`
- **Descrição:** Sem docstring.
- **Métodos:**
  - `def from_whatsapp(...):`



---

### 📄 Arquivo: `node_actions.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- httpx, typing.Any, typing.Dict, typing.List, typing.Optional, src.schemas.flow.FlowNode, src.schemas.flow.NodeType, src.common.schemas.UnifiedMessage, src.common.schemas.UnifiedMessageType, src.core.bus.rabbitmq_bus, src.services.condition_evaluator.ConditionEvaluator, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.database.SessionLocal, loguru.logger, datetime.datetime

**Classes Definidas:**
#### 🏛️ Classe: `NodeActions`
- **Descrição:** Biblioteca de funções executoras para cada tipo de nó.
Replicando o comportamento de 'NodeHandlers' do .NET.



---

### 📄 Arquivo: `payment_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, src.models.billing.Plan, src.models.billing.Subscription, src.models.transaction.Transaction, datetime.datetime, datetime.timedelta, loguru.logger, typing.Dict, typing.Any, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `PaymentService`
- **Descrição:** Motor de Pagamentos e Webhooks Financeiros.
Replica o 'PaymentEngine' do .NET integrado com Mercado Pago/Stripe.
- **Métodos:**
  - `def process_webhook(...):`



---

### 📄 Arquivo: `quota_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.models.billing.Subscription, src.models.billing.Plan, src.core.redis.redis_client, sqlalchemy.orm.Session, datetime.datetime, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `QuotaService`
- **Descrição:** Gerenciador de limites e quotas (SaaS Governing).
Controla mensagens enviadas e instâncias de bots por Tenant.
Replica o 'ResourceGuard' do .NET.
- **Métodos:**
  - `def can_create_bot(...):`
  - `def can_create_agent(...):`



---

### 📄 Arquivo: `session_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- typing.Optional, typing.Any, datetime.datetime, src.models.mongo.flow.SessionStateDocument, src.services.cache.CacheService, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `SessionService`
- **Descrição:** Gerencia o estado das conversas no MongoDB e Redis.
Replicando o SessionState Manager do .NET.



---

### 📄 Arquivo: `storage_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- os, shutil, fastapi.UploadFile, typing.Optional, loguru.logger, uuid

**Classes Definidas:**
#### 🏛️ Classe: `StorageService`
- **Descrição:** Gerenciador de Arquivos e Mídias (Imagens, Áudios, PDFs).
Substitui o 'BlobStorageService' do .NET que usava Azure/S3.
- **Métodos:**
  - `def ensure_upload_dir(...):`
  - `def get_public_url(...):`



---

### 📄 Arquivo: `whatsapp_bridge_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- httpx, typing.Any, typing.Dict, typing.Optional, src.core.config.settings, src.models.whatsapp.WhatsAppStatus, loguru.logger

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppBridgeService`
- **Descrição:** Controlador de comunicação com a Ponte Node.js (Venom-bot).
- **Métodos:**
  - `def __init__(...):`



---

### 📄 Arquivo: `whatsapp_manager_service.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- sqlalchemy.orm.Session, datetime.datetime, src.models.whatsapp.WhatsAppInstance, src.models.whatsapp.WhatsAppStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, src.core.tenancy.get_current_tenant_id, loguru.logger, typing.List, typing.Optional

**Classes Definidas:**
#### 🏛️ Classe: `WhatsAppManagerService`
- **Descrição:** Controlador de Negócio para instâncias de WhatsApp no Tenant.
Substitui o 'BotOrchestrator' do .NET.
- **Métodos:**
  - `def get_or_create_instance(...):`



---


### 📁 Camada: `src\workers`

### 📄 Arquivo: `ack_worker.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageStatus, src.core.database.SessionLocal, src.core.ws.ws_manager, src.schemas.whatsapp.WhatsAppAckStatus, loguru.logger, asyncio

**Classes Definidas:**
#### 🏛️ Classe: `AckWorker`
- **Descrição:** Worker que processa confirmações de recebimento (ACKs) de mensagens do provider.
Replicando o Serviço 'SaaS.Omnichannel.Services.AckTracker' do .NET.



---

### 📄 Arquivo: `campaign_worker.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.core.database.SessionLocal, src.models.campaign.Campaign, src.models.campaign.CampaignContact, src.models.campaign.CampaignStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, loguru.logger, datetime.datetime, asyncio, random

**Classes Definidas:**
#### 🏛️ Classe: `CampaignWorker`
- **Descrição:** Worker que processa campanhas em segundo plano.
Replicando 'MassDisparadorTask' do .NET.



---

### 📄 Arquivo: `flow_worker.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.services.flow_executor.FlowExecutor, src.models.mongo.flow.FlowDocument, src.services.session_service.SessionService, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.database.SessionLocal, src.core.ws.ws_manager, loguru.logger, json, asyncio

**Classes Definidas:**
#### 🏛️ Classe: `FlowWorker`
- **Descrição:** Worker que escuta mensagens do RabbitMQ e processa através da FlowEngine.
Replicando o Serviço 'SaaS.OmniChannelPlatform.Services.FlowEngine' do .NET.



---

### 📄 Arquivo: `outgoing_worker.py`
**Docstring:**
> Sem docstring no módulo.

**Dependências / Imports Principais:**
- src.core.bus.rabbitmq_bus, src.core.database.SessionLocal, src.core.tenancy.set_current_tenant_id, src.models.whatsapp.WhatsAppInstance, src.models.whatsapp.WhatsAppStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, loguru.logger, asyncio

**Classes Definidas:**
#### 🏛️ Classe: `OutgoingMessageWorker`
- **Descrição:** Worker que consome a fila de mensagens de saída e efetiva o envio
via WhatsApp Bridge (Baileys).



---


---
## 🟢 3. Análise do Bridge Node.js (WhatsApp Bot)


### 📁 Serviço: `SaaS.OmniChannelPlatform.Services.WhatsAppBot`

#### 📄 Arquivo: `index.js`
- **Tamanho:** 863 linhas

**Possíveis Funções / Handlers detectados:**
- `function normalizeToJid(phone) {`
- `async function connectToWhatsApp(sessionId) {`
- `ev.on('messages.upsert', ({ messages }) => {`
- `ev.on('chats.set', ({ chats }) => {`
- `ev.on('chats.upsert', (chats) => {`
- `ev.on('contacts.set', ({ contacts }) => {`
- `ev.on('contacts.upsert', (contacts) => {`
- `ev.on('messaging-history.set', ({ chats, contacts, messages }) => {`
- `getMessage: async (key) => {`
- `sock.ev.on('connection.update', async (update) => {`
- `sock.ev.on('messages.upsert', async ({ messages, type }) => {`
- `sock.ev.on('messages.update', async (updates) => {`
- `async function notifyStatus(sessionId, state, qrcode = null) {`
- `app.post('/instance/create', (req, res) => {`
- `app.post('/instance/stop', async (req, res) => {`
- `app.post('/instance/restart', async (req, res) => {`
- `app.get('/instance/qrcode', (req, res) => {`
- `app.get('/instance/connectionState', (req, res) => {`
- `app.post('/instance/sendMessage', async (req, res) => {`
- `app.get('/instance/chats', async (req, res) => {`
- `.sort((a, b) => {`
- `.map(chat => {`
- `app.get('/instance/chat-history', async (req, res) => {`
- `.map(msg => {`
- `app.post('/contacts/add', async (req, res) => {`
- *... e mais 4 funções omitidas.*

---

#### 📄 Arquivo: `test_send.js`
- **Tamanho:** 127 linhas

**Possíveis Funções / Handlers detectados:**
- `function httpPost(path, body) {`
- `return new Promise((resolve, reject) => {`
- `const req = http.request(opts, (res) => {`
- `res.on('end', () => {`
- `function httpGet(path) {`
- `return new Promise((resolve, reject) => {`
- `http.get({ hostname: '127.0.0.1', port: 4000, path }, (res) => {`
- `res.on('end', () => {`
- `async function waitForConnected(sessionId, maxWaitMs = 30000) {`
- `async function main() {`
- `main().catch(e => {`

---
