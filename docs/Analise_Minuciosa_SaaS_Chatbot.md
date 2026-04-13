# 🌌 Análise Profunda, Vasta e Detalhada - SaaS Chatbot Backend

Esta documentação compreende a **análise mais minuciosa e rica** do ecossistema backend e das documentações que compõem o SaaS Chatbot. Cada camada, serviço, controller e fluxo foi esmiuçado.

## 📚 1. Documentações e Markdowns (Sprints, Guias, MVP)

Os markdowns ditam o rumo, os requisitos e a arquitetura do projeto. Abaixo encontra-se a análise de cada manifesto do projeto.

### 📍 Diretório: `.`

#### 📄 `API_INTEGRATION_GUIDE.md`
- **Título Identificado:** 🌐 Guia de Integração Profundo: Front-end & Microserviços
- **Total de Linhas:** 134
- **Síntese / Resumo:** Este guia expandido detalha a arquitetura, segurança e padrões de implementação para integrar um front-end moderno (Vue 3 / Next.js) com o ecossistema SaaS Chatbot.

#### 📄 `BACKEND_API_GUIDE.md`
- **Título Identificado:** Documentação Técnica: Back-end API & Ecossistema de Rotas 🚀
- **Total de Linhas:** 156
- **Síntese / Resumo:** Este guia descreve as ferramentas, microsserviços e rotas disponíveis no back-end da plataforma SaaS OmniChannel, detalhando como o Frontend deve se conectar e quais dados são necessários para cada operação.

#### 📄 `FRONTEND_IMPLEMENTATION_GUIDE.md`
- **Título Identificado:** 💎 Guia de Implementação: Frontend Premium (Vue 3 + TypeScript)
- **Total de Linhas:** 121
- **Síntese / Resumo:** Este documento detalha a arquitetura, ferramentas, padrões de design e lógica de negócio implementados no novo ecossistema visual da plataforma **SaaS OmniChannel**.

#### 📄 `MVP_FEATURES.md`
- **Título Identificado:** MVP - SaaS OmniChannel Platform 🧩
- **Total de Linhas:** 48
- **Síntese / Resumo:** Este documento descreve as funcionalidades essenciais para o **Mínimo Produto Viável (MVP)** da plataforma, focado em entregar valor real para Administradores, Revendas e Clientes Finais.

#### 📄 `MVP_ROADMAP.md`
- **Título Identificado:** Roadmap de Desenvolvimento - MVP 🗺️
- **Total de Linhas:** 62
- **Síntese / Resumo:** Este roadmap detalha as 7 Sprints necessárias para construir o MVP funcional da plataforma SaaS OmniChannel.

#### 📄 `README.md`
- **Título Identificado:** SaaS OmniChannel Platform 🚀
- **Total de Linhas:** 110
- **Síntese / Resumo:** [![.NET Core CI](https://github.com/LuckArkman/SaaS-Chatbot/actions/workflows/dotnet-ci.yml/badge.svg)](https://github.com/LuckArkman/SaaS-Chatbot/actions/workflows/dotnet-ci.yml)

#### 📄 `agent_flow_integration_guide.md`
- **Título Identificado:** Bluebook: Guia de Integração Agente-Flow (v2.1)
- **Total de Linhas:** 141
- **Síntese / Resumo:** Este guia detalha a especificação técnica para a criação, orquestração e gestão de agentes através do motor de fluxos (**FlowEngine**) do SaaS Chatbot.

#### 📄 `integration_guide.md`
- **Título Identificado:** Guia Definitivo de Integração: FastAPI Backend ↔ Vue.js Frontend
- **Total de Linhas:** 158
- **Síntese / Resumo:** Este documento serve como o manual técnico oficial para a integração entre o novo ecossistema **Python/FastAPI** e a interface **Vue.js (ChatUI)**. Ele detalha todas as rotas, protocolos de comunicação e padrões de implementação necessários para manter a plataforma performática e segura.

### 📍 Diretório: `sprints`

#### 📄 `README.md`
- **Título Identificado:** Roadmap de Migração: .NET 8 para Python (FastAPI)
- **Total de Linhas:** 68
- **Síntese / Resumo:** Este documento serve como índice para as 45 sprints de migração da arquitetura backend do SaaS Chatbot.

#### 📄 `sprint_01_setup_python_base.md`
- **Título Identificado:** Sprint 01: Setup do Ambiente Base Python e CI/CD
- **Total de Linhas:** 38
- **Síntese / Resumo:** **Tema**: Inicialização do Ecossistema Python e Estrutura de Microserviços.

#### 📄 `sprint_02_identity_auth_migration.md`
- **Título Identificado:** Sprint 02: Migração do Core de Autenticação (JWT/Identity)
- **Total de Linhas:** 31
- **Síntese / Resumo:** **Tema**: Segurança e Controle de Acesso Baseado em Claims.

#### 📄 `sprint_03_tenancy_management.md`
- **Título Identificado:** Sprint 03: Implementação do Gerenciamento de Tenancy em Python
- **Total de Linhas:** 23
- **Síntese / Resumo:** **Tema**: Isolamento de Dados e Multi-tenancy (SaaS).

#### 📄 `sprint_04_identity_registration_flow.md`
- **Título Identificado:** Sprint 04: API de Registro e Recuperação de Senha
- **Total de Linhas:** 21
- **Síntese / Resumo:** **Tema**: Fluxos de Onboarding e Self-Service de Identidade.

#### 📄 `sprint_05_identity_validation.md`
- **Título Identificado:** Sprint 05: Testes de Integração e Validação de Segurança Identity
- **Total de Linhas:** 20
- **Síntese / Resumo:** **Tema**: QA e Hardening da Base de Identidade.

#### 📄 `sprint_06_error_handling_middleware.md`
- **Título Identificado:** Sprint 06: Desenvolvimento do Middleware de Tratamento de Erros
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Estabilidade e Resiliência Global.

#### 📄 `sprint_07_redis_connectivity_core.md`
- **Título Identificado:** Sprint 07: Core de Conectividade Redis e Caching
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Performance e Estado Compartilhado.

#### 📄 `sprint_08_rabbitmq_service_bus.md`
- **Título Identificado:** Sprint 08: Abstração de RabbitMQ (Service Bus) em Python
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Arquitetura Event-Driven.

#### 📄 `sprint_09_logging_telemetry.md`
- **Título Identificado:** Sprint 09: Logger Centralizado e Telemetria
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Observabilidade.

#### 📄 `sprint_10_dto_validation_schemas.md`
- **Título Identificado:** Sprint 10: Validação de DTOs com Pydantic e Schemas Base
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Integridade de Dados.

#### 📄 `sprint_11_channel_gateway_core.md`
- **Título Identificado:** Sprint 11: Migração do Channel Gateway (Core)
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Gateway de Entrada de Dados.

#### 📄 `sprint_12_whatsapp_webhooks.md`
- **Título Identificado:** Sprint 12: Webhooks de Integração para WhatsApp
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Conectividade com Provider.

#### 📄 `sprint_13_message_normalization.md`
- **Título Identificado:** Sprint 13: Filtros de Mensagens e Normalização de Payload
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Normalização de Dados.

#### 📄 `sprint_14_websocket_bridge.md`
- **Título Identificado:** Sprint 14: WebSocket Bridge para Comunicação UI
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Real-time Feed.

#### 📄 `sprint_15_gateway_load_test.md`
- **Título Identificado:** Sprint 15: Testes de Stress do Gateway
- **Total de Linhas:** 16
- **Síntese / Resumo:** **Tema**: Estabilidade sob Carga.

#### 📄 `sprint_16_flow_node_parsing.md`
- **Título Identificado:** Sprint 16: Migração da Lógica de Parsing de Nós do FlowBuilder
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Inteligência de Execução.

#### 📄 `sprint_17_mongodb_persistence_flow.md`
- **Título Identificado:** Sprint 17: Persistência de Fluxos no MongoDB (Python Beanie)
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Bancos Não-Relacionais.

#### 📄 `sprint_18_condition_interpreter.md`
- **Título Identificado:** Sprint 18: Interpretador de Condições e Variáveis de Sessão
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Lógica Dinâmica.

#### 📄 `sprint_19_async_node_execution.md`
- **Título Identificado:** Sprint 19: Execução Assíncrona de Nodes e Callbacks
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Execução de Fluxo.

#### 📄 `sprint_20_flow_management_api.md`
- **Título Identificado:** Sprint 20: APIs de Gerenciamento de Fluxos
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Backend Management.

#### 📄 `sprint_21_chat_service_core.md`
- **Título Identificado:** Sprint 21: Serviço de Chat em Tempo Real (FastAPI WebSockets)
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Comunicação Instantânea.

#### 📄 `sprint_22_message_history.md`
- **Título Identificado:** Sprint 22: Histórico de Mensagens e Persistência de Conversas
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Dados Históricos.

#### 📄 `sprint_23_message_status_tracking.md`
- **Título Identificado:** Sprint 23: Status de Mensagens (Enviado/Lido/Erro)
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Rastreamento e Confiabilidade.

#### 📄 `sprint_24_agent_assignment_logic.md`
- **Título Identificado:** Sprint 24: Atribuição Automática de Agentes
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Regras de Negócio.

#### 📄 `sprint_25_support_queues.md`
- **Título Identificado:** Sprint 25: Filas de Atendimento e Distribuição
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Experiência do Cliente.

#### 📄 `sprint_26_venom_bridge_control.md`
- **Título Identificado:** Sprint 26: Wrapper de Controle para Instâncias Venom/Node Bridge
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Integração Híbrida.

#### 📄 `sprint_27_qr_code_management.md`
- **Título Identificado:** Sprint 27: Gerenciamento de QR Code via API Python
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Autenticação de Canal.

#### 📄 `sprint_28_bot_event_listeners.md`
- **Título Identificado:** Sprint 28: Bot Event Listeners
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Callbacks de canal.

#### 📄 `sprint_29_bot_resiliency.md`
- **Título Identificado:** Sprint 29: Lógica de Auto-reconexão e Heartbeat
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Resiliência e Disponibilidade.

#### 📄 `sprint_30_media_handling.md`
- **Título Identificado:** Sprint 30: Envio de Mídias e Arquivos (Python/FastAPI Storage)
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Multimídia.

#### 📄 `sprint_31_billing_plans_core.md`
- **Título Identificado:** Sprint 31: Core de Precificação e Planos
- **Total de Linhas:** 20
- **Síntese / Resumo:** **Tema**: Monetização.

#### 📄 `sprint_32_payment_gateways.md`
- **Título Identificado:** Sprint 32: Integração com Gateway de Pagamento (Webhooks)
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Fintech/Pagamentos.

#### 📄 `sprint_33_usage_limits_control.md`
- **Título Identificado:** Sprint 33: Controle de Limites de Uso por Tenant
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Governança de Recursos.

#### 📄 `sprint_34_invoicing_system.md`
- **Título Identificado:** Sprint 34: Geração de Faturas e Dashboards Financeiros
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Reporting Financeiro.

#### 📄 `sprint_35_billing_notifications.md`
- **Título Identificado:** Sprint 35: Notificações de Vencimento e Renovação
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Retenção e CRM.

#### 📄 `sprint_36_campaign_scheduler.md`
- **Título Identificado:** Sprint 36: Agendador de Campanhas em Lote (Celery/Redis)
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Mass Mailing / Automação de Massa.

#### 📄 `sprint_37_contact_import_segmentation.md`
- **Título Identificado:** Sprint 37: Importação de Contatos e Listas de Segmentação
- **Total de Linhas:** 20
- **Síntese / Resumo:** **Tema**: Gestão de Leads.

#### 📄 `sprint_38_anti_ban_delays.md`
- **Título Identificado:** Sprint 38: Lógica de Rate Limiting para Evitar Banimento (Delay)
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Inteligência Antibloqueio.

#### 📄 `sprint_39_campaign_analytics.md`
- **Título Identificado:** Sprint 39: Relatórios de Conversão e Desempenho de Campanha
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Analytics.

#### 📄 `sprint_40_ab_testing_automation.md`
- **Título Identificado:** Sprint 40: AB-Testing para Fluxos de Automação
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Otimização.

#### 📄 `sprint_41_admin_dashboards_python.md`
- **Título Identificado:** Sprint 41: Dashboards Administrativos (AdminDashboards Migration)
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Gestão Global.

#### 📄 `sprint_42_frontend_api_sync.md`
- **Título Identificado:** Sprint 42: Integração Final Frontend (ChatUI) com APIs Python
- **Total de Linhas:** 20
- **Síntese / Resumo:** **Tema**: Frontend Sync.

#### 📄 `sprint_43_performance_tuning.md`
- **Título Identificado:** Sprint 43: Otimização de Performance e Profiling
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Polimento Técnico.

#### 📄 `sprint_44_final_docs_openapi.md`
- **Título Identificado:** Sprint 44: Documentação Final e OpenAPI (Swagger) Patterns
- **Total de Linhas:** 19
- **Síntese / Resumo:** **Tema**: Manutenibilidade.

#### 📄 `sprint_45_production_deploy_pm2.md`
- **Título Identificado:** Sprint 45: Deploy Final em Produção via PM2 / Nginx Reverse Proxy
- **Total de Linhas:** 18
- **Síntese / Resumo:** **Tema**: Go-Live.

### 📍 Diretório: `docs`

#### 📄 `Analise_Minuciosa_SaaS_Chatbot.md`
- **Título Identificado:** 🌌 Análise Profunda, Vasta e Detalhada - SaaS Chatbot Backend
- **Total de Linhas:** 157
- **Síntese / Resumo:** Esta documentação compreende a **análise mais minuciosa e rica** do ecossistema backend e das documentações que compõem o SaaS Chatbot. Cada camada, serviço, controller e fluxo foi esmiuçado.

#### 📄 `backend_analysis.md`
- **Título Identificado:** 🌌 Análise Profunda e Vasta do Backend do Projeto SaaS Chatbot
- **Total de Linhas:** 1860
- **Síntese / Resumo:** Esta documentação compreende uma análise extensa, exaustiva e detalhada de **todos** os scripts pertencentes ao backend da plataforma SaaS Chatbot.

#### 📄 `put_route_analysis.md`
- **Título Identificado:** Análise Minuciosa de Propagação (PUT /whatsapp/{phone})
- **Total de Linhas:** 67
- **Síntese / Resumo:** Abaixo encontra-se a análise ponto a ponto de **todo o trajeto de comunicação** da rota que deveria atualizar os dados do contato. O documento destrincha o porquê da informação falhar ao atingir o banco de dados (PostgreSQL) e o porquê de também falhar ao refletir no WhatsApp Web (através do Baileys...

---

## ⚙️ 2. Análise do Código-Fonte (Scaffold, Controllers, Services, Models)

Uma dissecção profunda de todos os módulos Python do ecossistema de microsserviços e rotas da API.

### 📁 Camada: `Raiz (Configurações e Entrypoints)`

#### 📜 Script: `main.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `fastapi.FastAPI, fastapi.middleware.cors.CORSMiddleware, src.core.config.settings, src.api.v1.api.api_router, src.core.middlewares.TenancyMiddleware, src.common.error_handlers.register_error_handlers, src.core.redis.redis_client, src.core.bus.rabbitmq_bus, src.core.bridge.start_websocket_bridge, src.core.logging.setup_logging ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def create_application () -> FastAPI`
    - *Ação:* Equivalente ao Program.cs / CreateBuilder no .NET

### 📁 Camada: `api`

#### 📜 Script: `deps.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Generator, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.security.OAuth2PasswordBearer, jose.jwt, pydantic.ValidationError, sqlalchemy.orm.Session, src.core.security, src.core.config.settings ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def get_current_user (db, token) -> User`
    - *Ação:* Sem docstring.
  - `def get_current_active_user (current_user) -> User`
    - *Ação:* Sem docstring.
  - `def get_current_active_superuser (current_user) -> User`
    - *Ação:* Sem docstring.

### 📁 Camada: `api\v1`

#### 📜 Script: `api.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `fastapi.APIRouter, src.api.v1.endpoints.auth, src.api.v1.endpoints.gateway, src.api.v1.endpoints.ws, src.api.v1.endpoints.flows, src.api.v1.endpoints.chat, src.api.v1.endpoints.bot, src.api.v1.endpoints.billing, src.api.v1.endpoints.campaigns, src.api.v1.endpoints.contacts ...`

### 📁 Camada: `api\v1\endpoints`

#### 📜 Script: `admin.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.List, typing.Dict, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.api.deps, src.core.database.get_db ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def get_global_summary (db, current_superuser) -> Any`
    - *Ação:* Visão geral global para SuperAdmins (Sprint 41).
  - `def list_all_transactions (db, current_superuser) -> Any`
    - *Ação:* Lista todas as transações financeiras da plataforma.
  - `def toggle_maintenance_mode (enabled, current_superuser) -> Any`
    - *Ação:* Simula a ativação do modo de manutenção global.

#### 📜 Script: `auth.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.security.OAuth2PasswordRequestForm, sqlalchemy.orm.Session, datetime.datetime, datetime.timedelta ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def login_access_token (db, form_data) -> Any`
    - *Ação:* OAuth2 compatible token login, get an access token for future requests
  - `def register_user () -> Any`
    - *Ação:* Registra um novo usuário e cria um novo Tenant associado.
  - `def recover_password (email, db) -> Any`
    - *Ação:* Password Recovery Logic (Stub)
  - `def reset_password (data, db) -> Any`
    - *Ação:* Reseta a senha usando um token válido.
  - `def change_password (data, db, current_user) -> Any`
    - *Ação:* Altera a senha do usuário logado.
  - `def read_user_me (current_user) -> Any`
    - *Ação:* Get current user.

#### 📜 Script: `billing.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.services.billing_service.BillingService, src.services.payment_service.PaymentService, src.services.invoicing_service.InvoicingService ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def list_public_plans (db) -> Any`
    - *Ação:* Lista todos os planos disponíveis para assinatura.
Replica o endpoint 'Pricing/Plans' do .NET.
  - `def get_my_subscription (db, tenant_id, current_user) -> Any`
    - *Ação:* Busca os detalhes da assinatura atual do Tenant ativo.
  - `def subscribe_to_plan (plan_id, db, tenant_id, curren) -> Any`
    - *Ação:* Inicia uma nova assinatura para o Tenant.
No futuro, isto integrará com Stripe/PagSeguro (Sprint 32)
  - `def create_checkout_endpoint (plan_id, db, tenant_id, curren) -> Any`
    - *Ação:* Gera o checkout de pagamento (Sprint 32).
  - `def payment_webhook_endpoint (provider, payload, db) -> Any`
    - *Ação:* Receptor global de notificações de pagamento.
  - `def get_financial_dashboard (db, tenant_id, current_user) -> Any`
    - *Ação:* Retorna o painel financeiro consolidado do Tenant (Sprint 34).

#### 📜 Script: `bot.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.Header, sqlalchemy.orm.Session, src.schemas, src.api.deps ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def get_bot_status (db, tenant_id, current_user) -> Any`
    - *Ação:* Busca o estado do Bot do Tenant.
  - `def get_bot_qr (db, tenant_id, current_user, a) -> Any`
    - *Ação:* Retorna o QR Code para pareamento. 
Se o header 'Accept' contiver 'text/event-stream', retorna um St
  - `def start_bot (db, tenant_id, current_user) -> Any`
    - *Ação:* Inicia o processo Node.js do Bot (Sprint 33).
  - `def stop_bot (db, tenant_id, current_user) -> Any`
    - *Ação:* Para o processo do Bot no Bridge.
  - `def restart_bot (db, tenant_id, current_user) -> Any`
    - *Ação:* Reinicia o processo do Bot no Bridge.
  - `def logout_bot (db, tenant_id, current_user) -> Any`
    - *Ação:* Desloga o WhatsApp e limpa a sessão.

#### 📜 Script: `campaigns.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, sqlalchemy.orm.Session, src.services.campaign_service.CampaignService, src.schemas.campaign.CampaignCreate, src.schemas.campaign.CampaignOut ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def list_campaigns (db, tenant_id, current_user) -> Any`
    - *Ação:* Busca as campanhas ativas do Tenant.
  - `def create_campaign (campaign_in, db, tenant_id, cu) -> Any`
    - *Ação:* Cria um rascunho de campanha.
  - `def schedule_campaign_endpoint (campaign_id, db, tenant_id, cu) -> Any`
    - *Ação:* Agenda e inicia o disparo da campanha.
  - `def pause_campaign_endpoint (campaign_id, db, tenant_id, cu) -> Any`
    - *Ação:* Pausa o disparo de uma campanha em andamento.

#### 📜 Script: `chat.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.Dict, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.Query, fastapi.status, fastapi.HTTPException, sqlalchemy.orm.Session, src.services.chat_service.ChatService ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def send_message (payload, db, tenant_id, curren) -> Any`
    - *Ação:* Agente envia uma mensagem para o cliente (WhatsApp).
O payload deve conter 'conversation_id' e 'cont
  - `def update_typing (is_typing, conversation_id, te) -> Any`
    - *Ação:* Notifica o sistema que o agente está digitando.
  - `def list_chat_history (conversation_id, limit, offset) -> Any`
    - *Ação:* Busca o histórico de mensagens de uma conversa específica.
  - `def transfer_chat_endpoint (conversation_id, target_agent_) -> Any`
    - *Ação:* Transfere uma conversa para outro agente.
  - `def get_agent_presence (user_id, tenant_id, current_us) -> Any`
    - *Ação:* Verifica se um agente específico está online.
  - `def list_conversations (limit, db, tenant_id, current_) -> Any`
    - *Ação:* 📱 **Lista todas as conversas abertas diretamente do WhatsApp conectado.**

Esta rota consulta o agen
  - `def get_conversation_history (jid, limit, db, tenant_id, cur) -> Any`
    - *Ação:* 📖 **Retorna o histórico de mensagens de uma conversa específica diretamente do WhatsApp.**

Consulta

#### 📜 Script: `contacts.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.List, typing.Dict, typing.Optional, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, fastapi.UploadFile, fastapi.File ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def list_contacts (db, tenant_id, current_user) -> Any`
    - *Ação:* Busca os contatos registrados do Tenant no banco de dados interno.
  - `def import_contacts_from_file (file, db, tenant_id, current_u) -> Any`
    - *Ação:* Importa contatos de um arquivo CSV (Sprint 37).
  - `def set_opt_out (phone, db, tenant_id, current_) -> Any`
    - *Ação:* Ativa o Opt-out para um contato específico.
  - `def list_tags (db, current_user) -> Any`
    - *Ação:* Sem docstring.
  - `def add_whatsapp_contact (payload, db, tenant_id, curren) -> Any`
    - *Ação:* Rota 1: Adicionar novo contato de WhatsApp.

Fluxo:
1. Recupera a sessão ativa do Tenant.
2. Garante
  - `def list_whatsapp_contacts (db, tenant_id, current_user) -> Any`
    - *Ação:* Rota 2: Listar todos os contatos do WhatsApp do agente.

Fluxo:
1. Recupera a sessão ativa do Tenant
  - `def edit_whatsapp_contact (phone, payload, db, tenant_id,) -> Any`
    - *Ação:* Sem docstring.
  - `def delete_whatsapp_contact (phone, db, tenant_id, current_) -> Any`
    - *Ação:* Sem docstring.

#### 📜 Script: `flows.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.List, fastapi.APIRouter, fastapi.Depends, fastapi.HTTPException, fastapi.status, src.models.mongo.flow.FlowDocument, src.schemas.flow.FlowCreate, src.schemas.flow.FlowUpdate, src.api.deps ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def list_flows (tenant_id, current_user) -> Any`
    - *Ação:* Lista todos os fluxos do Tenant.
  - `def create_flow (flow_in, tenant_id, current_us) -> Any`
    - *Ação:* Cria um novo fluxo de automação.
  - `def get_flow (flow_id, tenant_id, current_us) -> Any`
    - *Ação:* Busca um fluxo específico por ID.
  - `def update_flow (flow_id, flow_in, tenant_id, c) -> Any`
    - *Ação:* Atualiza um fluxo existente.
  - `def delete_flow (flow_id, tenant_id, current_us) -> Any`
    - *Ação:* Remove um fluxo.

#### 📜 Script: `gateway.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, fastapi.APIRouter, fastapi.Depends, fastapi.Header, fastapi.HTTPException, fastapi.status, src.schemas, src.schemas.whatsapp.WhatsAppPayload, src.schemas.whatsapp.WhatsAppMessageEvent, src.schemas.whatsapp.WhatsAppAckStatus ...`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def verify_gateway_key (x_api_key) -> Variável/Não tipado`
    - *Ação:* Sem docstring.
  - `def normalize_webhook_payload (raw) -> dict`
    - *Ação:* Normaliza o payload recebido para o formato esperado por WhatsAppPayload.

Aceita múltiplos formatos
  - `def incoming_webhook (channel_type, request, api_key) -> Any`
    - *Ação:* Endpoint de Webhook especializado para WhatsApp (Venom/Evolution) e outros canais.

Aceita tanto o f

#### 📜 Script: `ws.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `fastapi.APIRouter, fastapi.WebSocket, fastapi.WebSocketDisconnect, fastapi.Query, fastapi.Depends, src.core.ws.ws_manager, src.api.deps, src.core.security, loguru.logger, json`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def websocket_endpoint (websocket, token) -> Variável/Não tipado`
    - *Ação:* Endpoint WebSocket seguro. Exige Token JWT via Query Parameter.
Responsável por manter a bridge de e

### 📁 Camada: `common`

#### 📜 Script: `error_handlers.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `fastapi.Request, fastapi.FastAPI, fastapi.responses.JSONResponse, fastapi.exceptions.RequestValidationError, src.common.exceptions.AppException, loguru.logger, traceback, fastapi.encoders.jsonable_encoder`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def register_error_handlers (app) -> Variável/Não tipado`
    - *Ação:* Sem docstring.

#### 📜 Script: `exceptions.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.Dict, typing.Optional`

  **🏗️ Entidades / Classes Internas:**
  - **AppException** (Herda de: `Exception`)
    - *Responsabilidade:* Base exception for the application.
    - *Métodos:* __init__
  - **ValidationException** (Herda de: `AppException`)
    - *Responsabilidade:* Exception for validation errors (400).
    - *Métodos:* __init__
  - **NotFoundException** (Herda de: `AppException`)
    - *Responsabilidade:* Exception when a resource is not found (404).
    - *Métodos:* __init__
  - **UnauthorizedException** (Herda de: `AppException`)
    - *Responsabilidade:* Exception for auth failures (401).
    - *Métodos:* __init__
  - **ForbiddenException** (Herda de: `AppException`)
    - *Responsabilidade:* Exception for permission failures (403).
    - *Métodos:* __init__

#### 📜 Script: `logging_middleware.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `fastapi.Request, uuid, time, loguru.logger, starlette.middleware.base.BaseHTTPMiddleware, src.core.tenancy.get_current_tenant_id`

  **🏗️ Entidades / Classes Internas:**
  - **LoggingMiddleware** (Herda de: `BaseHTTPMiddleware`)
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* dispatch

#### 📜 Script: `schemas.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `enum.Enum, typing.Optional, typing.Dict, typing.Any, pydantic.BaseModel, pydantic.Field, datetime.datetime`

  **🏗️ Entidades / Classes Internas:**
  - **ChannelType** (Herda de: `str, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **UnifiedMessageType** (Herda de: `str, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **UnifiedMessage** (Herda de: `BaseModel`)
    - *Responsabilidade:* O formato canônico de mensagem para todo o ecossistema SaaS Chatbot.
Dessa forma, o FlowEngine e o ChatService não precisam saber de qual canal a mens
    - *Métodos:* sanitize_content

### 📁 Camada: `core`

#### 📜 Script: `bridge.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `src.core.bus.rabbitmq_bus, src.core.ws.ws_manager, loguru.logger, json, asyncio`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def start_websocket_bridge () -> Variável/Não tipado`
    - *Ação:* Task de segundo plano que escuta eventos do RabbitMQ e repassa
para as sessões de WebSocket (SignalR

#### 📜 Script: `bus.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `aio_pika, json, src.core.config.settings, loguru.logger, typing.Any, typing.Callable, typing.Awaitable`

  **🏗️ Entidades / Classes Internas:**
  - **RabbitMQBus**
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* __init__, connect, disconnect, publish, subscribe

#### 📜 Script: `config.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `os, pydantic_settings.BaseSettings, pydantic_settings.SettingsConfigDict, typing.Optional`

  **🏗️ Entidades / Classes Internas:**
  - **Settings** (Herda de: `BaseSettings`)
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* DATABASE_URL

#### 📜 Script: `database.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.create_engine, sqlalchemy.ext.declarative.declarative_base, sqlalchemy.orm.sessionmaker, src.core.config.settings`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def get_db () -> Variável/Não tipado`
    - *Ação:* Sem docstring.

#### 📜 Script: `logging.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sys, loguru.logger, src.core.config.settings`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def setup_logging () -> Variável/Não tipado`
    - *Ação:* Sem docstring.

#### 📜 Script: `middlewares.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `fastapi.Request, fastapi.status, fastapi.responses.JSONResponse, starlette.middleware.base.BaseHTTPMiddleware, src.core.tenancy.set_current_tenant_id, src.core.security.ALGORITHM, src.core.config.settings, src.core.database.SessionLocal, src.services.billing_service.BillingService, jose.jwt ...`

  **🏗️ Entidades / Classes Internas:**
  - **TenancyMiddleware** (Herda de: `BaseHTTPMiddleware`)
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* dispatch

#### 📜 Script: `multi_tenancy.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.String, sqlalchemy.event, sqlalchemy.orm.Session, sqlalchemy.orm.with_loader_criteria, src.core.tenancy.get_current_tenant_id`

  **🏗️ Entidades / Classes Internas:**
  - **MultiTenantMixin**
    - *Responsabilidade:* Mixin para adicionar isolamento de Tenant às entidades.

  **⚡ Controladores / Funções de Nível Superior:**
  - `def _add_tenant_filter (execute_state) -> Variável/Não tipado`
    - *Ação:* Injeta automaticamente o filtro 'WHERE tenant_id = ...' em todas as queries
de modelos que herdam de
  - `def tenant_persistence_hook (mapper, connection, target) -> Variável/Não tipado`
    - *Ação:* Garante que o tenant_id seja injetado no objeto antes de ser persistido.

#### 📜 Script: `redis.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `redis.asyncio, src.core.config.settings, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **RedisClient**
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* __init__, connect, disconnect, get, set, delete, exists

#### 📜 Script: `security.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `datetime.datetime, datetime.timedelta, typing.Any, typing.Union, jose.jwt, passlib.context.CryptContext, src.core.config.settings`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def create_access_token (subject, tenant_id, expires_de) -> str`
    - *Ação:* Sem docstring.
  - `def verify_password (plain_password, hashed_passwor) -> bool`
    - *Ação:* Sem docstring.
  - `def get_password_hash (password) -> str`
    - *Ação:* Sem docstring.

#### 📜 Script: `tenancy.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `contextvars.ContextVar, typing.Optional`

  **🏗️ Entidades / Classes Internas:**
  - **TenantContextError** (Herda de: `Exception`)
    - *Responsabilidade:* Erro lançado quando o Tenant ID não é encontrado no contexto quando obrigatório.

  **⚡ Controladores / Funções de Nível Superior:**
  - `def get_current_tenant_id () -> Optional[str]`
    - *Ação:* Retorna o Tenant ID do contexto atual.
  - `def set_current_tenant_id (tenant_id) -> None`
    - *Ação:* Define o Tenant ID no contexto da requisição atual.

#### 📜 Script: `validators.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `re, fastapi.HTTPException, fastapi.status`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def validate_password_complexity (password) -> Variável/Não tipado`
    - *Ação:* Replicando regras do IdentityOptions do .NET:
- Mínimo 8 caracteres
- Pelo menos uma letra maiúscula

#### 📜 Script: `ws.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Dict, typing.List, fastapi.WebSocket, src.core.redis.redis_client, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **ConnectionManager**
    - *Responsabilidade:* Gerencia as conexões WebSocket ativas, agrupadas por Tenant e Usuário.
Replica a lógica de Hubs do SignalR no .NET.
    - *Métodos:* __init__, connect, disconnect, send_to_conversation, send_personal_message, broadcast_to_tenant

### 📁 Camada: `models`

#### 📜 Script: `billing.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.Float, sqlalchemy.ForeignKey, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin ...`

  **🏗️ Entidades / Classes Internas:**
  - **Plan** (Herda de: `Base`)
    - *Responsabilidade:* Tabela global de planos disponíveis (SaaS).
Replaces the 'PricingPlan' entity from .NET.
  - **Subscription** (Herda de: `Base`)
    - *Responsabilidade:* Atribuição de um plano a um Tenant.
Diferente de outros modelos, este não usa MultiTenantMixin para filtragem global
pois ele é a PRÓPRIA definição do

#### 📜 Script: `campaign.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.ForeignKey, sqlalchemy.Boolean, sqlalchemy.JSON, sqlalchemy.event, sqlalchemy.orm.relationship ...`

  **🏗️ Entidades / Classes Internas:**
  - **CampaignStatus** (Herda de: `str, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **Campaign** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Modelo de Campanhas de Disparo Massivo.
Replaces 'MassCampaign' entity from .NET.
  - **CampaignContact** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Fila de disparos individuais de uma campanha.

#### 📜 Script: `chat.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.ForeignKey, sqlalchemy.Text, sqlalchemy.Enum, sqlalchemy.event, sqlalchemy.Index ...`

  **🏗️ Entidades / Classes Internas:**
  - **MessageSide** (Herda de: `str, enum.Enum`)
    - *Responsabilidade:* Sem docstring.
  - **MessageStatus** (Herda de: `str, enum.Enum`)
    - *Responsabilidade:* Sem docstring.
  - **Conversation** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Representação de uma conversa entre um contato e um Tenant.
Replaces the 'Conversation' entity from .NET.
  - **Message** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Registro histórico de cada interação.

#### 📜 Script: `contact.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.Table, sqlalchemy.ForeignKey, sqlalchemy.event, sqlalchemy.orm.relationship ...`

  **🏗️ Entidades / Classes Internas:**
  - **Tag** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Tags para segmentação de contatos.
Replaces 'LeadTag' from .NET.
  - **Contact** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Lead/Contato global do Tenant.
Utilizado para campanhas e CRM.

#### 📜 Script: `department.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.ForeignKey, sqlalchemy.Table, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin`

  **🏗️ Entidades / Classes Internas:**
  - **Department** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Representação de um Departamento/Setor (Ex: Vendas, Suporte).
Replaces the 'Department' entity from .NET.

#### 📜 Script: `invoice.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Float, sqlalchemy.DateTime, sqlalchemy.ForeignKey, sqlalchemy.event, sqlalchemy.orm.relationship, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin ...`

  **🏗️ Entidades / Classes Internas:**
  - **Invoice** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Fatura mensal gerada para o Tenant.
Replica a entidade 'InvoiceRecord' do .NET.

#### 📜 Script: `transaction.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Float, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.event, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin, src.core.multi_tenancy.tenant_persistence_hook ...`

  **🏗️ Entidades / Classes Internas:**
  - **Transaction** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Log histórico de pagamentos e transações financeiras (SaaS).
Substitui a entidade 'PaymentTransaction' do .NET.

#### 📜 Script: `user.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Boolean, sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.DateTime, sqlalchemy.orm.relationship, datetime.datetime, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin`

  **🏗️ Entidades / Classes Internas:**
  - **User** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Sem docstring.

#### 📜 Script: `whatsapp.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.Boolean, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.Enum, sqlalchemy.event, datetime.datetime, enum ...`

  **🏗️ Entidades / Classes Internas:**
  - **WhatsAppStatus** (Herda de: `str, enum.Enum`)
    - *Responsabilidade:* Sem docstring.
  - **WhatsAppInstance** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Representação persistente de uma instância do WhatsApp (Venom Session).
Replaces the 'BotInstance' C# entity from .NET.

#### 📜 Script: `whatsapp_events.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.Column, sqlalchemy.Integer, sqlalchemy.String, sqlalchemy.DateTime, sqlalchemy.Text, sqlalchemy.ForeignKey, sqlalchemy.event, datetime.datetime, src.core.database.Base, src.core.multi_tenancy.MultiTenantMixin ...`

  **🏗️ Entidades / Classes Internas:**
  - **WhatsAppSystemEvent** (Herda de: `Base, MultiTenantMixin`)
    - *Responsabilidade:* Log de eventos de sistema reportados pelas instâncias do WhatsApp.
Usado para auditoria de uptime e health metrics.
Replaces the 'BotEventLog' from .N

### 📁 Camada: `models\mongo`

#### 📜 Script: `chat.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Optional, typing.List, datetime.datetime, beanie.Document, beanie.Indexed, beanie.PydanticObjectId, pydantic.Field, enum`

  **🏗️ Entidades / Classes Internas:**
  - **MessageSource** (Herda de: `str, enum.Enum`)
    - *Responsabilidade:* Sem docstring.
  - **MessageDocument** (Herda de: `Document`)
    - *Responsabilidade:* Persistência completa de cada interação no SaaS (Sprint 40).
Permite restaurar o histórico completo após sincronização do WhatsApp.

#### 📜 Script: `flow.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.List, typing.Optional, typing.Any, datetime.datetime, beanie.Document, beanie.Indexed, beanie.PydanticObjectId, pydantic.Field, src.schemas.flow.FlowNode, src.schemas.flow.FlowEdge`

  **🏗️ Entidades / Classes Internas:**
  - **FlowDocument** (Herda de: `Document`)
    - *Responsabilidade:* Representação persistente de um Fluxo no MongoDB via Beanie.
Replaces the 'Flow' C# entity from .NET.
  - **SessionStateDocument** (Herda de: `Document`)
    - *Responsabilidade:* Estado da sessão atual de um usuário em um fluxo específico.
Controla em qual nó o usuário parou e as variáveis coletadas.

### 📁 Camada: `schemas`

#### 📜 Script: `base.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Generic, typing.TypeVar, typing.List, typing.Optional, typing.Any, pydantic.BaseModel`

  **🏗️ Entidades / Classes Internas:**
  - **BaseResponse** (Herda de: `BaseModel, Generic[T]`)
    - *Responsabilidade:* Wrapper padrão para respostas da API.
  - **PagedResponse** (Herda de: `BaseModel, Generic[T]`)
    - *Responsabilidade:* Wrapper para listas paginadas.
  - **ErrorDetail** (Herda de: `BaseModel`)
    - *Responsabilidade:* Estrutura detalhada de erro.
  - **ErrorResponse** (Herda de: `BaseModel`)
    - *Responsabilidade:* Resposta padrão de erro.

#### 📜 Script: `billing.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Optional, typing.List, pydantic.BaseModel, pydantic.Field, datetime.datetime`

  **🏗️ Entidades / Classes Internas:**
  - **PlanBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **PlanCreate** (Herda de: `PlanBase`)
    - *Responsabilidade:* Sem docstring.
  - **PlanOut** (Herda de: `PlanBase`)
    - *Responsabilidade:* Sem docstring.
  - **SubscriptionBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **SubscriptionCreate** (Herda de: `SubscriptionBase`)
    - *Responsabilidade:* Sem docstring.
  - **SubscriptionOut** (Herda de: `SubscriptionBase`)
    - *Responsabilidade:* Sem docstring.

#### 📜 Script: `campaign.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Optional, typing.List, pydantic.BaseModel, pydantic.ConfigDict, datetime.datetime`

  **🏗️ Entidades / Classes Internas:**
  - **CampaignBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **CampaignCreate** (Herda de: `CampaignBase`)
    - *Responsabilidade:* Sem docstring.
  - **CampaignOut** (Herda de: `CampaignBase`)
    - *Responsabilidade:* Sem docstring.
  - **CampaignContactBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **CampaignContactOut** (Herda de: `CampaignContactBase`)
    - *Responsabilidade:* Sem docstring.

#### 📜 Script: `chat.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.List, typing.Optional, datetime.datetime, pydantic.BaseModel, pydantic.Field, src.models.chat.MessageSide`

  **🏗️ Entidades / Classes Internas:**
  - **MessageBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **MessageCreate** (Herda de: `MessageBase`)
    - *Responsabilidade:* Sem docstring.
  - **MessageOut** (Herda de: `MessageBase`)
    - *Responsabilidade:* Sem docstring.
  - **AgentSummary** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **ConversationOut** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **ConversationWithMessages** (Herda de: `ConversationOut`)
    - *Responsabilidade:* Sem docstring.
  - **ConversationListResponse** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **ConversationDetailResponse** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.

#### 📜 Script: `common.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `re, typing.Annotated, pydantic.AfterValidator`

  **⚡ Controladores / Funções de Nível Superior:**
  - `def validate_whatsapp_phone (v) -> str`
    - *Ação:* Validador customizado para garantir formato internacional de telefone.

#### 📜 Script: `contact.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Optional, typing.List, pydantic.BaseModel, pydantic.ConfigDict, pydantic.field_validator, datetime.datetime`

  **🏗️ Entidades / Classes Internas:**
  - **TagBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **TagCreate** (Herda de: `TagBase`)
    - *Responsabilidade:* Sem docstring.
  - **TagOut** (Herda de: `TagBase`)
    - *Responsabilidade:* Sem docstring.
  - **ContactBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **ContactCreate** (Herda de: `ContactBase`)
    - *Responsabilidade:* Sem docstring.
  - **ContactOut** (Herda de: `ContactBase`)
    - *Responsabilidade:* Sem docstring.
  - **WhatsAppContactAdd** (Herda de: `BaseModel`)
    - *Responsabilidade:* Payload para adicionar/verificar um contato no WhatsApp do agente.
    - *Métodos:* phone_must_have_digits
  - **WhatsAppContactUpdate** (Herda de: `BaseModel`)
    - *Responsabilidade:* Payload para atualizar contato sem obrigatoriedade do telefone no body.
  - **WhatsAppContactVerified** (Herda de: `BaseModel`)
    - *Responsabilidade:* Contato verificado/retornado pelo Bridge.
  - **WhatsAppContactAddOut** (Herda de: `BaseModel`)
    - *Responsabilidade:* Resposta da rota POST /contacts/whatsapp.
  - **WhatsAppContactListOut** (Herda de: `BaseModel`)
    - *Responsabilidade:* Resposta da rota GET /contacts/whatsapp.

#### 📜 Script: `filters.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Optional, pydantic.BaseModel, pydantic.Field`

  **🏗️ Entidades / Classes Internas:**
  - **FilterParams** (Herda de: `BaseModel`)
    - *Responsabilidade:* Parâmetros base para filtragem, ordenação e paginação.
Inspirado nos padrões OData/REST do .NET.
    - *Métodos:* skip

#### 📜 Script: `flow.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `enum.Enum, typing.List, typing.Dict, typing.Optional, typing.Any, pydantic.BaseModel, pydantic.Field, pydantic.field_validator`

  **🏗️ Entidades / Classes Internas:**
  - **NodeType** (Herda de: `str, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **Position** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **FlowNode** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* validate_data
  - **FlowEdge** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **FlowDefinition** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **FlowCreate** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **FlowUpdate** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.

#### 📜 Script: `gateway.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `enum.Enum, typing.Optional, typing.Dict, typing.Any, pydantic.BaseModel, pydantic.Field, src.schemas.common.WhatsAppPhone`

  **🏗️ Entidades / Classes Internas:**
  - **MessageType** (Herda de: `str, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **IncomingMessage** (Herda de: `BaseModel`)
    - *Responsabilidade:* Schema para mensagens recebidas dos canais (WhatsApp/Bot).

#### 📜 Script: `user.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Optional, pydantic.BaseModel, pydantic.EmailStr, pydantic.BaseModel, pydantic.EmailStr, pydantic.Field`

  **🏗️ Entidades / Classes Internas:**
  - **UserBase** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **UserCreate** (Herda de: `UserBase`)
    - *Responsabilidade:* Sem docstring.
  - **UserUpdate** (Herda de: `UserBase`)
    - *Responsabilidade:* Sem docstring.
  - **UserInDBBase** (Herda de: `UserBase`)
    - *Responsabilidade:* Sem docstring.
  - **User** (Herda de: `UserInDBBase`)
    - *Responsabilidade:* Sem docstring.
  - **UserRegister** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **PasswordResetRequest** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **PasswordResetConfirm** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **PasswordChangeInternal** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **Token** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **TokenPayload** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.

#### 📜 Script: `whatsapp.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `enum.Enum, typing.Optional, typing.Dict, typing.Any, typing.List, datetime.datetime, pydantic.BaseModel, pydantic.ConfigDict, pydantic.Field, src.schemas.gateway.MessageType`

  **🏗️ Entidades / Classes Internas:**
  - **WhatsAppStatus** (Herda de: `str, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **WhatsAppInstance** (Herda de: `BaseModel`)
    - *Responsabilidade:* Sem docstring.
  - **WhatsAppMessageEvent** (Herda de: `str, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **WhatsAppAckStatus** (Herda de: `int, Enum`)
    - *Responsabilidade:* Sem docstring.
  - **WhatsAppPayload** (Herda de: `BaseModel`)
    - *Responsabilidade:* Payload bruto recebido do Venom-bot/Evolution API.
  - **WhatsAppMessage** (Herda de: `BaseModel`)
    - *Responsabilidade:* Estrutura de uma mensagem dentro do payload do WhatsApp.
  - **WhatsAppAck** (Herda de: `BaseModel`)
    - *Responsabilidade:* Estrutura de confirmação de leitura/entrega.

### 📁 Camada: `services`

#### 📜 Script: `agent_assignment_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, src.models.user.User, src.models.chat.Conversation, src.core.redis.redis_client, loguru.logger, typing.Optional`

  **🏗️ Entidades / Classes Internas:**
  - **AgentAssignmentService**
    - *Responsabilidade:* Motor de distribuição automática de chats (Round-Robin).
Substitui a lógica de 'AgentDispatch' do .NET.
    - *Métodos:* assign_agent, transfer_chat

#### 📜 Script: `billing_notification_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, src.models.billing.Subscription, src.services.invoicing_service.InvoicingService, datetime.datetime, datetime.timedelta, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **BillingNotificationService**
    - *Responsabilidade:* Controlador de Retenção e Alertas de Faturamento.
Replica o 'SubscriptionGuard' do .NET.
    - *Métodos:* process_billing_heartbeat

#### 📜 Script: `billing_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, src.models.billing.Plan, src.models.billing.Subscription, loguru.logger, typing.List, typing.Optional, datetime.datetime`

  **🏗️ Entidades / Classes Internas:**
  - **BillingService**
    - *Responsabilidade:* Gerenciador de faturamento e assinaturas.
Replica a lógica de 'BillingEngine' do .NET.
    - *Métodos:* list_public_plans, get_tenant_subscription, check_plan_validity, assign_default_plan

#### 📜 Script: `cache.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `json, typing.Any, typing.Optional, src.core.redis.redis_client`

  **🏗️ Entidades / Classes Internas:**
  - **CacheService**
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* get_json, set_json, remove

#### 📜 Script: `campaign_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, src.models.campaign.Campaign, src.models.campaign.CampaignContact, src.models.campaign.CampaignStatus, loguru.logger, typing.List, typing.Optional, datetime.datetime`

  **🏗️ Entidades / Classes Internas:**
  - **CampaignService**
    - *Responsabilidade:* Controlador de campanhas e disparos em massa.
Replicando 'BroadcastingService' do .NET.
    - *Métodos:* create_campaign, add_contacts, schedule_campaign

#### 📜 Script: `chat_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.List, typing.Optional, typing.Any, typing.Dict, datetime.datetime, src.models.mongo.chat.MessageDocument, src.models.mongo.chat.MessageSource, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.bus.rabbitmq_bus ...`

  **🏗️ Entidades / Classes Internas:**
  - **ChatService**
    - *Responsabilidade:* Serviço Unificado de Chat (Postgres + MongoDB).
Controla interações em tempo real (Sprint 21) e Persistência de Histórico (Sprint 40).
    - *Métodos:* normalize_phone, _resolve_recipient_phone, send_agent_message, set_typing_status, save_message, get_history, get_session_history

#### 📜 Script: `condition_evaluator.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `re, typing.Any, typing.Dict, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **ConditionEvaluator**
    - *Responsabilidade:* Avalia expressões lógicas simples baseadas em variáveis de sessão.
Suporta formatos como: {{variable_name}} == "value", {{count}} > 5, etc.
Replicando
    - *Métodos:* evaluate, inject_variables

#### 📜 Script: `contact_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, src.models.contact.Contact, src.models.contact.Tag, loguru.logger, typing.List, typing.Dict, typing.Any, typing.Optional, io, csv`

  **🏗️ Entidades / Classes Internas:**
  - **ContactService**
    - *Responsabilidade:* Motor de Importação e Segmentação de Leads.
Replica o 'LeadImporterService' do .NET.
    - *Métodos:* normalize_phone, import_csv, get_contacts_by_tags, set_blacklist

#### 📜 Script: `flow_executor.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Any, typing.Dict, typing.List, typing.Optional, src.schemas.flow.FlowDefinition, src.schemas.flow.FlowNode, src.schemas.flow.NodeType, src.models.mongo.flow.SessionStateDocument, src.services.flow_interpreter.FlowGraph, src.services.node_actions.NodeActions ...`

  **🏗️ Entidades / Classes Internas:**
  - **FlowExecutor**
    - *Responsabilidade:* Motor Principal de Execução de Fluxo.
Responsável por transitar entre nodes e disparar as ações corretas.
Replicando o motor central do FlowEngine C#.
    - *Métodos:* __init__, run_step

#### 📜 Script: `flow_interpreter.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.List, typing.Dict, typing.Optional, typing.Any, src.schemas.flow.FlowDefinition, src.schemas.flow.FlowNode, src.schemas.flow.FlowEdge, src.schemas.flow.NodeType, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **FlowGraph**
    - *Responsabilidade:* Representação em Grafo de um Fluxo de Automação para rápida travessia.
Replica a lógica da engine C# do FlowBuilder original.
    - *Métodos:* __init__, find_start_node, get_next_node, validate_flow

#### 📜 Script: `gemini_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `httpx, typing.List, typing.Dict, typing.Optional, src.core.config.settings, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **GeminiService**
    - *Responsabilidade:* Serviço de integração com o Google Gemma 3 12B via Google AI Studio API.
Suporta histórico de conversa multi-turn para respostas contextuais.
    - *Métodos:* _api_url, generate_response, build_history_from_messages

#### 📜 Script: `invoicing_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, src.models.invoice.Invoice, src.models.billing.Subscription, src.models.billing.Plan, src.models.transaction.Transaction, datetime.datetime, datetime.timedelta, loguru.logger, typing.List, typing.Dict ...`

  **🏗️ Entidades / Classes Internas:**
  - **InvoicingService**
    - *Responsabilidade:* Gerador de Faturas e Dashboards Financeiros.
Replica a lógica de 'AccountingEngine' do .NET.
    - *Métodos:* get_user_dashboard, generate_monthly_invoice

#### 📜 Script: `message_history_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, datetime.datetime, src.models.chat.Conversation, src.models.chat.Message, src.models.chat.MessageSide, src.models.chat.MessageStatus, src.core.tenancy.get_current_tenant_id, loguru.logger, typing.List, typing.Optional`

  **🏗️ Entidades / Classes Internas:**
  - **MessageHistoryService**
    - *Responsabilidade:* Serviço central de persistência de histórico de chat (Postgres).
Replica a lógica da camada de dados do ChatApp original.
    - *Métodos:* get_or_create_conversation, record_message, update_message_status, list_history, list_conversations, get_conversation_detail

#### 📜 Script: `message_normalizer.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `src.common.schemas.UnifiedMessage, src.common.schemas.ChannelType, src.common.schemas.UnifiedMessageType, src.schemas, datetime.datetime, loguru.logger, typing.Any, typing.Dict`

  **🏗️ Entidades / Classes Internas:**
  - **MessageNormalizer**
    - *Responsabilidade:* Sem docstring.
    - *Métodos:* from_whatsapp

#### 📜 Script: `node_actions.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `httpx, typing.Any, typing.Dict, typing.List, typing.Optional, src.schemas.flow.FlowNode, src.schemas.flow.NodeType, src.common.schemas.UnifiedMessage, src.common.schemas.UnifiedMessageType, src.core.bus.rabbitmq_bus ...`

  **🏗️ Entidades / Classes Internas:**
  - **NodeActions**
    - *Responsabilidade:* Biblioteca de funções executoras para cada tipo de nó.
Replicando o comportamento de 'NodeHandlers' do .NET.
    - *Métodos:* execute_message_node, execute_api_call_node, execute_handover_node, execute_ai_node

#### 📜 Script: `payment_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, src.models.billing.Plan, src.models.billing.Subscription, src.models.transaction.Transaction, datetime.datetime, datetime.timedelta, loguru.logger, typing.Dict, typing.Any, typing.Optional`

  **🏗️ Entidades / Classes Internas:**
  - **PaymentService**
    - *Responsabilidade:* Motor de Pagamentos e Webhooks Financeiros.
Replica o 'PaymentEngine' do .NET integrado com Mercado Pago/Stripe.
    - *Métodos:* generate_checkout, process_webhook

#### 📜 Script: `quota_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `src.models.billing.Subscription, src.models.billing.Plan, src.core.redis.redis_client, sqlalchemy.orm.Session, datetime.datetime, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **QuotaService**
    - *Responsabilidade:* Gerenciador de limites e quotas (SaaS Governing).
Controla mensagens enviadas e instâncias de bots por Tenant.
Replica o 'ResourceGuard' do .NET.
    - *Métodos:* increment_message_usage, can_create_bot, can_create_agent

#### 📜 Script: `session_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `typing.Optional, typing.Any, datetime.datetime, src.models.mongo.flow.SessionStateDocument, src.services.cache.CacheService, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **SessionService**
    - *Responsabilidade:* Gerencia o estado das conversas no MongoDB e Redis.
Replicando o SessionState Manager do .NET.
    - *Métodos:* get_or_create_session, update_session, set_variable

#### 📜 Script: `storage_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `os, shutil, fastapi.UploadFile, typing.Optional, loguru.logger, uuid`

  **🏗️ Entidades / Classes Internas:**
  - **StorageService**
    - *Responsabilidade:* Gerenciador de Arquivos e Mídias (Imagens, Áudios, PDFs).
Substitui o 'BlobStorageService' do .NET que usava Azure/S3.
    - *Métodos:* ensure_upload_dir, save_upload, get_public_url

#### 📜 Script: `whatsapp_bridge_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `httpx, typing.Any, typing.Dict, typing.Optional, src.core.config.settings, src.models.whatsapp.WhatsAppStatus, loguru.logger`

  **🏗️ Entidades / Classes Internas:**
  - **WhatsAppBridgeService**
    - *Responsabilidade:* Controlador de comunicação com a Ponte Node.js (Venom-bot).
    - *Métodos:* __init__, create_session, stop_instance, restart_instance, fetch_status, get_qrcode, logout, send_file, send_message, add_contact, edit_contact, delete_contact, list_contacts, list_chats, get_chat_history

#### 📜 Script: `whatsapp_manager_service.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `sqlalchemy.orm.Session, datetime.datetime, src.models.whatsapp.WhatsAppInstance, src.models.whatsapp.WhatsAppStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, src.core.tenancy.get_current_tenant_id, loguru.logger, typing.List, typing.Optional`

  **🏗️ Entidades / Classes Internas:**
  - **WhatsAppManagerService**
    - *Responsabilidade:* Controlador de Negócio para instâncias de WhatsApp no Tenant.
Substitui o 'BotOrchestrator' do .NET.
    - *Métodos:* get_or_create_instance, initialize_bot, stop_bot, restart_bot, sync_instance_status, health_check_all

### 📁 Camada: `workers`

#### 📜 Script: `ack_worker.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageStatus, src.core.database.SessionLocal, src.core.ws.ws_manager, src.schemas.whatsapp.WhatsAppAckStatus, loguru.logger, asyncio`

  **🏗️ Entidades / Classes Internas:**
  - **AckWorker**
    - *Responsabilidade:* Worker que processa confirmações de recebimento (ACKs) de mensagens do provider.
Replicando o Serviço 'SaaS.Omnichannel.Services.AckTracker' do .NET.
    - *Métodos:* start, handle_message_ack

#### 📜 Script: `campaign_worker.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.core.database.SessionLocal, src.models.campaign.Campaign, src.models.campaign.CampaignContact, src.models.campaign.CampaignStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, loguru.logger, datetime.datetime, asyncio ...`

  **🏗️ Entidades / Classes Internas:**
  - **CampaignWorker**
    - *Responsabilidade:* Worker que processa campanhas em segundo plano.
Replicando 'MassDisparadorTask' do .NET.
    - *Métodos:* start, process_campaign

#### 📜 Script: `flow_worker.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `src.core.bus.rabbitmq_bus, src.core.tenancy.set_current_tenant_id, src.services.flow_executor.FlowExecutor, src.models.mongo.flow.FlowDocument, src.services.session_service.SessionService, src.services.message_history_service.MessageHistoryService, src.models.chat.MessageSide, src.core.database.SessionLocal, src.core.ws.ws_manager, loguru.logger ...`

  **🏗️ Entidades / Classes Internas:**
  - **FlowWorker**
    - *Responsabilidade:* Worker que escuta mensagens do RabbitMQ e processa através da FlowEngine.
Replicando o Serviço 'SaaS.OmniChannelPlatform.Services.FlowEngine' do .NET.
    - *Métodos:* start, handle_incoming_message

#### 📜 Script: `outgoing_worker.py`
- **Propósito do Módulo:** Sem docstring.
- **Engrenagens (Imports):** `src.core.bus.rabbitmq_bus, src.core.database.SessionLocal, src.core.tenancy.set_current_tenant_id, src.models.whatsapp.WhatsAppInstance, src.models.whatsapp.WhatsAppStatus, src.services.whatsapp_bridge_service.whatsapp_bridge, loguru.logger, asyncio`

  **🏗️ Entidades / Classes Internas:**
  - **OutgoingMessageWorker**
    - *Responsabilidade:* Worker que consome a fila de mensagens de saída e efetiva o envio
via WhatsApp Bridge (Baileys).
    - *Métodos:* start, process_outgoing

