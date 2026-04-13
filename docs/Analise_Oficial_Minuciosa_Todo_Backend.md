# 🧠 Análise Profundamente Minuciosa do Backend: SaaS Chatbot

> Este documento contém uma varredura rica e contextual de todos os scripts e arquivos markdown do projeto, revelando a arquitetura completa do ecossistema.


## 📚 1. Contexto Geral e Documentação (Markdowns)

### 📄 Arquivo: `agent_flow_integration_guide.md`
- **Título Encontrado**: Bluebook: Guia de Integração Agente-Flow (v2.1)
- **Resumo/Trecho**: Este guia detalha a especificação técnica para a criação, orquestração e gestão de agentes através do motor de fluxos (**FlowEngine**) do SaaS Chatbot...

### 📄 Arquivo: `API_INTEGRATION_GUIDE.md`
- **Título Encontrado**: 🌐 Guia de Integração Profundo: Front-end & Microserviços
- **Resumo/Trecho**: Este guia expandido detalha a arquitetura, segurança e padrões de implementação para integrar um front-end moderno (Vue 3 / Next.js) com o ecossistema...

### 📄 Arquivo: `BACKEND_API_GUIDE.md`
- **Título Encontrado**: Documentação Técnica: Back-end API & Ecossistema de Rotas 🚀
- **Resumo/Trecho**: Este guia descreve as ferramentas, microsserviços e rotas disponíveis no back-end da plataforma SaaS OmniChannel, detalhando como o Frontend deve se c...

### 📄 Arquivo: `FRONTEND_IMPLEMENTATION_GUIDE.md`
- **Título Encontrado**: 💎 Guia de Implementação: Frontend Premium (Vue 3 + TypeScript)
- **Resumo/Trecho**: Este documento detalha a arquitetura, ferramentas, padrões de design e lógica de negócio implementados no novo ecossistema visual da plataforma **SaaS...

### 📄 Arquivo: `integration_guide.md`
- **Título Encontrado**: Guia Definitivo de Integração: FastAPI Backend ↔ Vue.js Frontend
- **Resumo/Trecho**: Este documento serve como o manual técnico oficial para a integração entre o novo ecossistema **Python/FastAPI** e a interface **Vue.js (ChatUI)**. El...

### 📄 Arquivo: `MVP_FEATURES.md`
- **Título Encontrado**: MVP - SaaS OmniChannel Platform 🧩
- **Resumo/Trecho**: Este documento descreve as funcionalidades essenciais para o **Mínimo Produto Viável (MVP)** da plataforma, focado em entregar valor real para Adminis...

### 📄 Arquivo: `MVP_ROADMAP.md`
- **Título Encontrado**: Roadmap de Desenvolvimento - MVP 🗺️
- **Resumo/Trecho**: Este roadmap detalha as 7 Sprints necessárias para construir o MVP funcional da plataforma SaaS OmniChannel. - Estrutura de Solution e Projetos (DDD +...

### 📄 Arquivo: `README.md`
- **Título Encontrado**: SaaS OmniChannel Platform 🚀
- **Resumo/Trecho**: [![.NET Core CI](https://github.com/LuckArkman/SaaS-Chatbot/actions/workflows/dotnet-ci.yml/badge.svg)](https://github.com/LuckArkman/SaaS-Chatbot/act...

### 📄 Arquivo: `agent\README.md`
- **Título Encontrado**: 🤖 AI Agent Module
- **Resumo/Trecho**: Este módulo implementa uma interface unificada, assíncrona e orientada a objetos para gerenciar o Agente de IA. Ele encapsula provedores populares par...

### 📄 Arquivo: `docs\Analise_Minuciosa_SaaS_Chatbot.md`
- **Título Encontrado**: 🌌 Análise Profunda, Vasta e Detalhada - SaaS Chatbot Backend
- **Resumo/Trecho**: Esta documentação compreende a **análise mais minuciosa e rica** do ecossistema backend e das documentações que compõem o SaaS Chatbot. Cada camada, s...

### 📄 Arquivo: `docs\Analise_Oficial_Minuciosa_Todo_Backend.md`
- **Título Encontrado**: 🧠 Análise Profundamente Minuciosa do Backend: SaaS Chatbot
- **Resumo/Trecho**: > Este documento contém uma varredura rica e contextual de todos os scripts e arquivos markdown do projeto, revelando a arquitetura completa do ecossi...

### 📄 Arquivo: `docs\backend_analysis.md`
- **Título Encontrado**: 🌌 Análise Profunda e Vasta do Backend do Projeto SaaS Chatbot
- **Resumo/Trecho**: Esta documentação compreende uma análise extensa, exaustiva e detalhada de **todos** os scripts pertencentes ao backend da plataforma SaaS Chatbot. A ...

### 📄 Arquivo: `docs\backend_deep_analysis.md`
- **Título Encontrado**: 🪐 SaaS-Chatbot: Deep Backend Technical Analysis
- **Resumo/Trecho**: This document provides a comprehensive, vast, and deeply detailed architectural analysis of the **SaaS-Chatbot** backend. It explores every layer of t...

### 📄 Arquivo: `docs\Backend_Deep_Audit_Report.md`
- **Título Encontrado**: 🌌 Auditoria Estendida e Detalhada do Backend e Documentação
- **Resumo/Trecho**: Este documento contém a análise abrangente e profunda de todos os scripts do backend (Python e Node.js) e de todos os arquivos Markdown presentes no p...

### 📄 Arquivo: `docs\put_route_analysis.md`
- **Título Encontrado**: Análise Minuciosa de Propagação (PUT /whatsapp/{phone})
- **Resumo/Trecho**: Abaixo encontra-se a análise ponto a ponto de **todo o trajeto de comunicação** da rota que deveria atualizar os dados do contato. O documento destrin...

### 📄 Arquivo: `SaaS.ChatUI\README.md`
- **Título Encontrado**: Vue 3 + TypeScript + Vite
- **Resumo/Trecho**: This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [...

## 🏃‍♂️ 2. Arquitetura de Sprints (Roadmap)

A documentação reflete o método de evolução do projeto. Abaixo estão os sprints detalhados:

- **`README.md`**: Roadmap de Migração: .NET 8 para Python (FastAPI) - _Este documento serve como índice para as 45 sprints de migração da arquitetura backend do SaaS Chatbot. - [Sprint 01 - Setup do Ambiente Base Python e..._
- **`sprint_01_setup_python_base.md`**: Sprint 01: Setup do Ambiente Base Python e CI/CD - _**Tema**: Inicialização do Ecossistema Python e Estrutura de Microserviços. **Objetivo**: Estabelecer a base sólida para o desenvolvimento dos novos s..._
- **`sprint_02_identity_auth_migration.md`**: Sprint 02: Migração do Core de Autenticação (JWT/Identity) - _**Tema**: Segurança e Controle de Acesso Baseado em Claims. **Objetivo**: Replicar a segurança robusta do ASP.NET Identity em FastAPI. - [x] Criar mod..._
- **`sprint_03_tenancy_management.md`**: Sprint 03: Implementação do Gerenciamento de Tenancy em Python - _**Tema**: Isolamento de Dados e Multi-tenancy (SaaS). **Objetivo**: Garantir que as requisições identifiquem corretamente o locatário (Tenant) e isole..._
- **`sprint_04_identity_registration_flow.md`**: Sprint 04: API de Registro e Recuperação de Senha - _**Tema**: Fluxos de Onboarding e Self-Service de Identidade. **Objetivo**: Concluir as funcionalidades de borda do Serviço de Identidade. - [x] Endpoi..._
- **`sprint_05_identity_validation.md`**: Sprint 05: Testes de Integração e Validação de Segurança Identity - _**Tema**: QA e Hardening da Base de Identidade. **Objetivo**: Garantir que o serviço Python porte a mesma segurança e performance que a versão .NET. -..._
- **`sprint_06_error_handling_middleware.md`**: Sprint 06: Desenvolvimento do Middleware de Tratamento de Erros - _**Tema**: Estabilidade e Resiliência Global. **Objetivo**: Padronizar as respostas de erro em JSON, assim como o `ExceptionMiddleware` do .NET. - [x] ..._
- **`sprint_07_redis_connectivity_core.md`**: Sprint 07: Core de Conectividade Redis e Caching - _**Tema**: Performance e Estado Compartilhado. **Objetivo**: Implementar o wrapper de Redis para cache de tokens e sessões. - [x] Implementar Singleton..._
- **`sprint_08_rabbitmq_service_bus.md`**: Sprint 08: Abstração de RabbitMQ (Service Bus) em Python - _**Tema**: Arquitetura Event-Driven. **Objetivo**: Criar a ponte de comunicação assíncrona entre microserviços. - [x] Implementar conexão persistente c..._
- **`sprint_09_logging_telemetry.md`**: Sprint 09: Logger Centralizado e Telemetria - _**Tema**: Observabilidade. **Objetivo**: Padronizar logs estruturados (JSON) para fácil análise posterior. - [x] Definir formatos de log: `TIMESTAMP |..._
- **`sprint_10_dto_validation_schemas.md`**: Sprint 10: Validação de DTOs com Pydantic e Schemas Base - _**Tema**: Integridade de Dados. **Objetivo**: Centralizar as regras de validação que no .NET ficavam em `FluentValidation` ou no `ModelState`. - [x] I..._
- **`sprint_11_channel_gateway_core.md`**: Sprint 11: Migração do Channel Gateway (Core) - _**Tema**: Gateway de Entrada de Dados. **Objetivo**: Receber as mensagens brutas dos canais (WhatsApp/Bot) e encaminhá-las para processamento. - [x] I..._
- **`sprint_12_whatsapp_webhooks.md`**: Sprint 12: Webhooks de Integração para WhatsApp - _**Tema**: Conectividade com Provider. **Objetivo**: Processar os pacotes JSON específicos do WhatsApp (Venom/Evolution). - [x] Criar Pydantic Schemas ..._
- **`sprint_13_message_normalization.md`**: Sprint 13: Filtros de Mensagens e Normalização de Payload - _**Tema**: Normalização de Dados. **Objetivo**: Transformar qualquer mensagem de canal no formato `UnifiedMessage` do projeto. - [x] Implementar classe..._
- **`sprint_14_websocket_bridge.md`**: Sprint 14: WebSocket Bridge para Comunicação UI - _**Tema**: Real-time Feed. **Objetivo**: Enviar eventos de borda diretamente para o ChatUI do agente. - [x] Implementar Connection Manager para gerenci..._
- **`sprint_15_gateway_load_test.md`**: Sprint 15: Testes de Stress do Gateway - _**Tema**: Estabilidade sob Carga. **Objetivo**: Garantir que o Gateway suporte milhares de mensagens simultâneas. - [x] Criar script de bombardeio de ..._
- **`sprint_16_flow_node_parsing.md`**: Sprint 16: Migração da Lógica de Parsing de Nós do FlowBuilder - _**Tema**: Inteligência de Execução. **Objetivo**: Reimplementar o interpretador de JSON dos fluxos que vêm do Frontend. - [x] Implementar representaçã..._
- **`sprint_17_mongodb_persistence_flow.md`**: Sprint 17: Persistência de Fluxos no MongoDB (Python Beanie) - _**Tema**: Bancos Não-Relacionais. **Objetivo**: Migrar de `SaaS.OmniChannelPlatform.Services.FlowEngine` (C#) para Python usando Beanie. - [x] Configu..._
- **`sprint_18_condition_interpreter.md`**: Sprint 18: Interpretador de Condições e Variáveis de Sessão - _**Tema**: Lógica Dinâmica. **Objetivo**: Avaliar condições IF/ELSE baseadas em variáveis coletadas durante o chat. - [x] Implementar interpretador bás..._
- **`sprint_19_async_node_execution.md`**: Sprint 19: Execução Assíncrona de Nodes e Callbacks - _**Tema**: Execução de Fluxo. **Objetivo**: Garantir que o bot seja capaz de chamar APIs externas e esperar retornos sem travar o Event Loop. - [x] Imp..._
- **`sprint_20_flow_management_api.md`**: Sprint 20: APIs de Gerenciamento de Fluxos - _**Tema**: Backend Management. **Objetivo**: Endpoints para o frontend salvar e gerenciar os fluxos criados. - [x] Endpoint para Criar/Atualizar Fluxos..._
- **`sprint_21_chat_service_core.md`**: Sprint 21: Serviço de Chat em Tempo Real (FastAPI WebSockets) - _**Tema**: Comunicação Instantânea. **Objetivo**: Criar o servidor de mensageria que conecta Agentes (UI) a Clientes (WhatsApp). - [x] Implementar `Bro..._
- **`sprint_22_message_history.md`**: Sprint 22: Histórico de Mensagens e Persistência de Conversas - _**Tema**: Dados Históricos. **Objetivo**: Armazenar todas as interações no Postgres para consulta futura e auditoria. - [x] Criar tabelas `Conversatio..._
- **`sprint_23_message_status_tracking.md`**: Sprint 23: Status de Mensagens (Enviado/Lido/Erro) - _**Tema**: Rastreamento e Confiabilidade. **Objetivo**: Garantir que o status da mensagem no UI reflita a realidade técnica (check duplo). - [x] Implem..._
- **`sprint_24_agent_assignment_logic.md`**: Sprint 24: Atribuição Automática de Agentes - _**Tema**: Regras de Negócio. **Objetivo**: Definir qual humano atende qual conversa quando o robô encerra o fluxo. - [x] Implementar distribuição equi..._
- **`sprint_25_support_queues.md`**: Sprint 25: Filas de Atendimento e Distribuição - _**Tema**: Experiência do Cliente. **Objetivo**: Gerenciar a prioridade e o tempo de espera nas filas de suporte. - [x] Criar tabelas de `Department` e..._
- **`sprint_26_venom_bridge_control.md`**: Sprint 26: Wrapper de Controle para Instâncias Venom/Node Bridge - _**Tema**: Integração Híbrida. **Objetivo**: Controlar o ciclo de vida dos processos Node.js através da API Python. - [x] Implementar chamadas à API da..._
- **`sprint_27_qr_code_management.md`**: Sprint 27: Gerenciamento de QR Code via API Python - _**Tema**: Autenticação de Canal. **Objetivo**: Exibir o QR Code do WhatsApp no Frontend a partir do sinal gerado pelo bot. - [x] Streaming de QR Code ..._
- **`sprint_28_bot_event_listeners.md`**: Sprint 28: Bot Event Listeners - _**Tema**: Callbacks de canal. **Objetivo**: Escutar tudo o que o bot relata (estado da bateria, conexão aberta/fechada). - [x] Mapear eventos: `CONNEC..._
- **`sprint_29_bot_resiliency.md`**: Sprint 29: Lógica de Auto-reconexão e Heartbeat - _**Tema**: Resiliência e Disponibilidade. **Objetivo**: Garantir que o bot tente se reconectar sozinho em caso de quedas de rede. - [x] Tarefa agendada..._
- **`sprint_30_media_handling.md`**: Sprint 30: Envio de Mídias e Arquivos (Python/FastAPI Storage) - _**Tema**: Multimídia. **Objetivo**: Gerenciar o upload e download de imagens, vídeos e áudios que passam pelo sistema. - [x] Implementar interface de ..._
- **`sprint_31_billing_plans_core.md`**: Sprint 31: Core de Precificação e Planos - _**Tema**: Monetização. **Objetivo**: Implementar a lógica de planos e assinaturas que sustentará o modelo SaaS. - [x] Criar tabelas `Plans` e `Subscri..._
- **`sprint_32_payment_gateways.md`**: Sprint 32: Integração com Gateway de Pagamento (Webhooks) - _**Tema**: Fintech/Pagamentos. **Objetivo**: Processar pagamentos reais (Mercado Pago/Asaas/Stripe) via Python. - [x] Implementar endpoint seguro para ..._
- **`sprint_33_usage_limits_control.md`**: Sprint 33: Controle de Limites de Uso por Tenant - _**Tema**: Governança de Recursos. **Objetivo**: Impedir que um tenant use mais recursos (mensagens/bot) do que seu plano permite. - [x] Contador de me..._
- **`sprint_34_invoicing_system.md`**: Sprint 34: Geração de Faturas e Dashboards Financeiros - _**Tema**: Reporting Financeiro. **Objetivo**: Exibir transparência de gastos e faturas para os clientes no UI. - [x] Geração de faturamento mensal sim..._
- **`sprint_35_billing_notifications.md`**: Sprint 35: Notificações de Vencimento e Renovação - _**Tema**: Retenção e CRM. **Objetivo**: Enviar lembretes proativos de pagamento aos clientes. - [x] Scheduler implementado em src/main.py (start_billi..._
- **`sprint_36_campaign_scheduler.md`**: Sprint 36: Agendador de Campanhas em Lote (Celery/Redis) - _**Tema**: Mass Mailing / Automação de Massa. **Objetivo**: Disparar milhares de mensagens sem travar o sistema. - [x] Criar tabelas de `Campaign` e `C..._
- **`sprint_37_contact_import_segmentation.md`**: Sprint 37: Importação de Contatos e Listas de Segmentação - _**Tema**: Gestão de Leads. **Objetivo**: Oferecer ferramentas para organizar quem receberá as mensagens. - [x] Implementar parser assíncrono para plan..._
- **`sprint_38_anti_ban_delays.md`**: Sprint 38: Lógica de Rate Limiting para Evitar Banimento (Delay) - _**Tema**: Inteligência Antibloqueio. **Objetivo**: Simular comportamento humano no envio de massa. - [x] Implementar intervalo variável (Random Delay ..._
- **`sprint_39_campaign_analytics.md`**: Sprint 39: Relatórios de Conversão e Desempenho de Campanha - _**Tema**: Analytics. **Objetivo**: Entregar dados reais de sucesso (Cliques, Leituras, Respostas). - [x] Identificar engajamento do usuário (Atribuiçã..._
- **`sprint_40_ab_testing_automation.md`**: Sprint 40: AB-Testing para Fluxos de Automação - _**Tema**: Otimização. **Objetivo**: Permitir testar diferentes fluxos para descobrir qual converte melhor. - [x] Criar nó especial `AB-Split` no Flow ..._
- **`sprint_41_admin_dashboards_python.md`**: Sprint 41: Dashboards Administrativos (AdminDashboards Migration) - _**Tema**: Gestão Global. **Objetivo**: Replicar a Blazor/C# Management UI agora consumindo dados das novas APIs Python. - [x] Endpoints Python para vi..._
- **`sprint_42_frontend_api_sync.md`**: Sprint 42: Integração Final Frontend (ChatUI) com APIs Python - _**Tema**: Frontend Sync. **Objetivo**: Virar a chave do Frontend para falar APENAS com o novo ecossistema Python. - [x] Atualizar endereços de API (VI..._
- **`sprint_43_performance_tuning.md`**: Sprint 43: Otimização de Performance e Profiling - _**Tema**: Polimento Técnico. **Objetivo**: Garantir tempos de resposta baixos e escalabilidade na VPS. - [x] Otimização de queries de conversas (Índic..._
- **`sprint_44_final_docs_openapi.md`**: Sprint 44: Documentação Final e OpenAPI (Swagger) Patterns - _**Tema**: Manutenibilidade. **Objetivo**: Deixar o projeto pronto para outros desenvolvedores. - [x] Documentação completa injetada no FastAPI (main.p..._
- **`sprint_45_production_deploy_pm2.md`**: Sprint 45: Deploy Final em Produção via PM2 / Nginx Reverse Proxy - _**Tema**: Go-Live. **Objetivo**: O pico final. Migrar os processos .NET para Python na VPS definitivamente. - [x] Proxy reverso validado para rotear t..._


## 🐍 3. Arquitetura do Backend Python (`src/`)

Estrutura central do SaaS, baseada em FastAPI.

### 📁 Módulo: `CORE`
#### 📜 `core\bridge.py`
- *(Script vazio ou apenas definições/variáveis)*

#### 📜 `core\bus.py`
- **Classe `RabbitMQBus`**
  - *Métodos*: __init__

#### 📜 `core\config.py`
- **Classe `Settings`**
  - *Métodos*: DATABASE_URL

#### 📜 `core\database.py`
- **Função `get_db`**

#### 📜 `core\logging.py`
- **Função `setup_logging`**

#### 📜 `core\middlewares.py`
- **Classe `TenancyMiddleware`**

#### 📜 `core\multi_tenancy.py`
- **Classe `MultiTenantMixin`**
  - *Doc*: Mixin para adicionar isolamento de Tenant às entidades.
- **Função `_add_tenant_filter`**
  - *Doc*: Injeta automaticamente o filtro 'WHERE tenant_id = ...' em todas as queries
- **Função `tenant_persistence_hook`**
  - *Doc*: Garante que o tenant_id seja injetado no objeto antes de ser persistido.

#### 📜 `core\redis.py`
- **Classe `RedisClient`**
  - *Métodos*: __init__

#### 📜 `core\security.py`
- **Função `create_access_token`**
- **Função `verify_password`**
- **Função `get_password_hash`**

#### 📜 `core\tenancy.py`
- **Classe `TenantContextError`**
  - *Doc*: Erro lançado quando o Tenant ID não é encontrado no contexto quando obrigatório.
- **Função `get_current_tenant_id`**
  - *Doc*: Retorna o Tenant ID do contexto atual.
- **Função `set_current_tenant_id`**
  - *Doc*: Define o Tenant ID no contexto da requisição atual.

#### 📜 `core\validators.py`
- **Função `validate_password_complexity`**
  - *Doc*: Replicando regras do IdentityOptions do .NET:

#### 📜 `core\ws.py`
- **Classe `ConnectionManager`**
  - *Doc*: Gerencia as conexões WebSocket ativas, agrupadas por Tenant e Usuário.
  - *Métodos*: __init__

### 📁 Módulo: `MODELS`
#### 📜 `models\billing.py`
- **Classe `Plan`**
  - *Doc*: Tabela global de planos disponíveis (SaaS).
- **Classe `Subscription`**
  - *Doc*: Atribuição de um plano a um Tenant.

#### 📜 `models\campaign.py`
- **Classe `CampaignStatus`**
- **Classe `Campaign`**
  - *Doc*: Modelo de Campanhas de Disparo Massivo.
- **Classe `CampaignContact`**
  - *Doc*: Fila de disparos individuais de uma campanha.

#### 📜 `models\chat.py`
- **Classe `MessageSide`**
- **Classe `MessageStatus`**
- **Classe `Conversation`**
  - *Doc*: Representação de uma conversa entre um contato e um Tenant.
- **Classe `Message`**
  - *Doc*: Registro histórico de cada interação.

#### 📜 `models\contact.py`
- **Classe `Tag`**
  - *Doc*: Tags para segmentação de contatos.
- **Classe `Contact`**
  - *Doc*: Lead/Contato global do Tenant.

#### 📜 `models\department.py`
- **Classe `Department`**
  - *Doc*: Representação de um Departamento/Setor (Ex: Vendas, Suporte).

#### 📜 `models\invoice.py`
- **Classe `Invoice`**
  - *Doc*: Fatura mensal gerada para o Tenant.

#### 📜 `models\transaction.py`
- **Classe `Transaction`**
  - *Doc*: Log histórico de pagamentos e transações financeiras (SaaS).

#### 📜 `models\user.py`
- **Classe `User`**

#### 📜 `models\whatsapp.py`
- **Classe `WhatsAppStatus`**
- **Classe `WhatsAppInstance`**
  - *Doc*: Representação persistente de uma instância do WhatsApp (Venom Session).

#### 📜 `models\whatsapp_events.py`
- **Classe `WhatsAppSystemEvent`**
  - *Doc*: Log de eventos de sistema reportados pelas instâncias do WhatsApp.

#### 📜 `models\mongo\chat.py`
- **Classe `MessageSource`**
- **Classe `MessageDocument`**
  - *Doc*: Persistência completa de cada interação no SaaS (Sprint 40).

#### 📜 `models\mongo\flow.py`
- **Classe `FlowDocument`**
  - *Doc*: Representação persistente de um Fluxo no MongoDB via Beanie.
- **Classe `SessionStateDocument`**
  - *Doc*: Estado da sessão atual de um usuário em um fluxo específico.

### 📁 Módulo: `SCHEMAS`
#### 📜 `schemas\base.py`
- **Classe `BaseResponse`**
  - *Doc*: Wrapper padrão para respostas da API.
- **Classe `PagedResponse`**
  - *Doc*: Wrapper para listas paginadas.
- **Classe `ErrorDetail`**
  - *Doc*: Estrutura detalhada de erro.
- **Classe `ErrorResponse`**
  - *Doc*: Resposta padrão de erro.

#### 📜 `schemas\billing.py`
- **Classe `PlanBase`**
- **Classe `PlanCreate`**
- **Classe `PlanOut`**
- **Classe `SubscriptionBase`**
- **Classe `SubscriptionCreate`**
- **Classe `SubscriptionOut`**

#### 📜 `schemas\campaign.py`
- **Classe `CampaignBase`**
- **Classe `CampaignCreate`**
- **Classe `CampaignOut`**
- **Classe `CampaignContactBase`**
- **Classe `CampaignContactOut`**

#### 📜 `schemas\chat.py`
- **Classe `MessageBase`**
- **Classe `MessageCreate`**
- **Classe `MessageOut`**
- **Classe `AgentSummary`**
- **Classe `ConversationOut`**
- **Classe `ConversationWithMessages`**
- **Classe `ConversationListResponse`**
- **Classe `ConversationDetailResponse`**

#### 📜 `schemas\common.py`
- **Função `validate_whatsapp_phone`**
  - *Doc*: Validador customizado para garantir formato internacional de telefone.

#### 📜 `schemas\contact.py`
- **Classe `TagBase`**
- **Classe `TagCreate`**
- **Classe `TagOut`**
- **Classe `ContactBase`**
- **Classe `ContactCreate`**
- **Classe `ContactOut`**
- **Classe `WhatsAppContactAdd`**
  - *Doc*: Payload para adicionar/verificar um contato no WhatsApp do agente.
  - *Métodos*: phone_must_have_digits
- **Classe `WhatsAppContactUpdate`**
  - *Doc*: Payload para atualizar contato sem obrigatoriedade do telefone no body.
- **Classe `WhatsAppContactVerified`**
  - *Doc*: Contato verificado/retornado pelo Bridge.
- **Classe `WhatsAppContactAddOut`**
  - *Doc*: Resposta da rota POST /contacts/whatsapp.
- **Classe `WhatsAppContactListOut`**
  - *Doc*: Resposta da rota GET /contacts/whatsapp.

#### 📜 `schemas\filters.py`
- **Classe `FilterParams`**
  - *Doc*: Parâmetros base para filtragem, ordenação e paginação.
  - *Métodos*: skip

#### 📜 `schemas\flow.py`
- **Classe `NodeType`**
- **Classe `Position`**
- **Classe `FlowNode`**
  - *Métodos*: validate_data
- **Classe `FlowEdge`**
- **Classe `FlowDefinition`**
- **Classe `FlowCreate`**
- **Classe `FlowUpdate`**

#### 📜 `schemas\gateway.py`
- **Classe `MessageType`**
- **Classe `IncomingMessage`**
  - *Doc*: Schema para mensagens recebidas dos canais (WhatsApp/Bot).

#### 📜 `schemas\user.py`
- **Classe `UserBase`**
- **Classe `UserCreate`**
- **Classe `UserUpdate`**
- **Classe `UserInDBBase`**
- **Classe `User`**
- **Classe `UserRegister`**
- **Classe `PasswordResetRequest`**
- **Classe `PasswordResetConfirm`**
- **Classe `PasswordChangeInternal`**
- **Classe `Token`**
- **Classe `TokenPayload`**

#### 📜 `schemas\whatsapp.py`
- **Classe `WhatsAppStatus`**
- **Classe `WhatsAppInstance`**
- **Classe `WhatsAppMessageEvent`**
- **Classe `WhatsAppAckStatus`**
- **Classe `WhatsAppPayload`**
  - *Doc*: Payload bruto recebido do Venom-bot/Evolution API.
- **Classe `WhatsAppMessage`**
  - *Doc*: Estrutura de uma mensagem dentro do payload do WhatsApp.
- **Classe `WhatsAppAck`**
  - *Doc*: Estrutura de confirmação de leitura/entrega.

### 📁 Módulo: `COMMON`
#### 📜 `common\error_handlers.py`
- **Função `register_error_handlers`**

#### 📜 `common\exceptions.py`
- **Classe `AppException`**
  - *Doc*: Base exception for the application.
  - *Métodos*: __init__
- **Classe `ValidationException`**
  - *Doc*: Exception for validation errors (400).
  - *Métodos*: __init__
- **Classe `NotFoundException`**
  - *Doc*: Exception when a resource is not found (404).
  - *Métodos*: __init__
- **Classe `UnauthorizedException`**
  - *Doc*: Exception for auth failures (401).
  - *Métodos*: __init__
- **Classe `ForbiddenException`**
  - *Doc*: Exception for permission failures (403).
  - *Métodos*: __init__

#### 📜 `common\logging_middleware.py`
- **Classe `LoggingMiddleware`**

#### 📜 `common\schemas.py`
- **Classe `ChannelType`**
- **Classe `UnifiedMessageType`**
- **Classe `UnifiedMessage`**
  - *Doc*: O formato canônico de mensagem para todo o ecossistema SaaS Chatbot.
  - *Métodos*: sanitize_content

### 📁 Módulo: `API`
#### 📜 `api\deps.py`
- **Função `get_current_user`**
- **Função `get_current_active_user`**
- **Função `get_current_active_superuser`**

#### 📜 `api\v1\api.py`
- *(Script vazio ou apenas definições/variáveis)*

#### 📜 `api\v1\endpoints\admin.py`
- **Função `get_global_summary`**
  - *Doc*: Visão geral global para SuperAdmins (Sprint 41).
- **Função `list_all_transactions`**
  - *Doc*: Lista todas as transações financeiras da plataforma.
- **Função `toggle_maintenance_mode`**
  - *Doc*: Simula a ativação do modo de manutenção global.

#### 📜 `api\v1\endpoints\auth.py`
- **Função `login_access_token`**
  - *Doc*: OAuth2 compatible token login, get an access token for future requests
- **Função `register_user`**
  - *Doc*: Registra um novo usuário e cria um novo Tenant associado.
- **Função `recover_password`**
  - *Doc*: Password Recovery Logic (Stub)
- **Função `reset_password`**
  - *Doc*: Reseta a senha usando um token válido.
- **Função `change_password`**
  - *Doc*: Altera a senha do usuário logado.
- **Função `read_user_me`**
  - *Doc*: Get current user.

#### 📜 `api\v1\endpoints\billing.py`
- **Função `list_public_plans`**
  - *Doc*: Lista todos os planos disponíveis para assinatura.
- **Função `get_my_subscription`**
  - *Doc*: Busca os detalhes da assinatura atual do Tenant ativo.
- **Função `subscribe_to_plan`**
  - *Doc*: Inicia uma nova assinatura para o Tenant.
- **Função `get_financial_dashboard`**
  - *Doc*: Retorna o painel financeiro consolidado do Tenant (Sprint 34).

#### 📜 `api\v1\endpoints\bot.py`
- *(Script vazio ou apenas definições/variáveis)*

#### 📜 `api\v1\endpoints\campaigns.py`
- **Função `list_campaigns`**
  - *Doc*: Busca as campanhas ativas do Tenant.
- **Função `create_campaign`**
  - *Doc*: Cria um rascunho de campanha.

#### 📜 `api\v1\endpoints\chat.py`
- *(Script vazio ou apenas definições/variáveis)*

#### 📜 `api\v1\endpoints\contacts.py`
- **Função `set_opt_out`**
  - *Doc*: Ativa o Opt-out para um contato específico.
- **Função `list_tags`**

#### 📜 `api\v1\endpoints\flows.py`
- *(Script vazio ou apenas definições/variáveis)*

#### 📜 `api\v1\endpoints\gateway.py`
- **Função `verify_gateway_key`**
- **Função `normalize_webhook_payload`**
  - *Doc*: Normaliza o payload recebido para o formato esperado por WhatsAppPayload.

#### 📜 `api\v1\endpoints\ws.py`
- *(Script vazio ou apenas definições/variáveis)*

### 📁 Módulo: `SERVICES`
#### 📜 `services\agent_assignment_service.py`
- **Classe `AgentAssignmentService`**
  - *Doc*: Motor de distribuição automática de chats (Round-Robin).
  - *Métodos*: transfer_chat

#### 📜 `services\billing_notification_service.py`
- **Classe `BillingNotificationService`**
  - *Doc*: Controlador de Retenção e Alertas de Faturamento.

#### 📜 `services\billing_service.py`
- **Classe `BillingService`**
  - *Doc*: Gerenciador de faturamento e assinaturas.
  - *Métodos*: list_public_plans, get_tenant_subscription, check_plan_validity, assign_default_plan

#### 📜 `services\cache.py`
- **Classe `CacheService`**

#### 📜 `services\campaign_service.py`
- **Classe `CampaignService`**
  - *Doc*: Controlador de campanhas e disparos em massa.
  - *Métodos*: create_campaign, add_contacts

#### 📜 `services\chat_service.py`
- **Classe `ChatService`**
  - *Doc*: Serviço Unificado de Chat (Postgres + MongoDB).
  - *Métodos*: normalize_phone

#### 📜 `services\condition_evaluator.py`
- **Classe `ConditionEvaluator`**
  - *Doc*: Avalia expressões lógicas simples baseadas em variáveis de sessão.
  - *Métodos*: evaluate, inject_variables

#### 📜 `services\contact_service.py`
- **Classe `ContactService`**
  - *Doc*: Motor de Importação e Segmentação de Leads.
  - *Métodos*: normalize_phone, import_csv, get_contacts_by_tags, set_blacklist

#### 📜 `services\flow_executor.py`
- **Classe `FlowExecutor`**
  - *Doc*: Motor Principal de Execução de Fluxo.
  - *Métodos*: __init__

#### 📜 `services\flow_interpreter.py`
- **Classe `FlowGraph`**
  - *Doc*: Representação em Grafo de um Fluxo de Automação para rápida travessia.
  - *Métodos*: __init__, find_start_node, get_next_node, validate_flow

#### 📜 `services\gemini_service.py`
- **Classe `GeminiService`**
  - *Doc*: Serviço de integração com o Google Gemma 3 12B via Google AI Studio API.
  - *Métodos*: _api_url, build_history_from_messages

#### 📜 `services\invoicing_service.py`
- **Classe `InvoicingService`**
  - *Doc*: Gerador de Faturas e Dashboards Financeiros.
  - *Métodos*: get_user_dashboard, generate_monthly_invoice

#### 📜 `services\message_history_service.py`
- **Classe `MessageHistoryService`**
  - *Doc*: Serviço central de persistência de histórico de chat (Postgres).
  - *Métodos*: get_or_create_conversation, update_message_status, list_history, list_conversations, get_conversation_detail

#### 📜 `services\message_normalizer.py`
- **Classe `MessageNormalizer`**
  - *Métodos*: from_whatsapp

#### 📜 `services\node_actions.py`
- **Classe `NodeActions`**
  - *Doc*: Biblioteca de funções executoras para cada tipo de nó.

#### 📜 `services\payment_service.py`
- **Classe `PaymentService`**
  - *Doc*: Motor de Pagamentos e Webhooks Financeiros.
  - *Métodos*: process_webhook

#### 📜 `services\quota_service.py`
- **Classe `QuotaService`**
  - *Doc*: Gerenciador de limites e quotas (SaaS Governing).
  - *Métodos*: can_create_bot, can_create_agent

#### 📜 `services\session_service.py`
- **Classe `SessionService`**
  - *Doc*: Gerencia o estado das conversas no MongoDB e Redis.

#### 📜 `services\storage_service.py`
- **Classe `StorageService`**
  - *Doc*: Gerenciador de Arquivos e Mídias (Imagens, Áudios, PDFs).
  - *Métodos*: ensure_upload_dir, get_public_url

#### 📜 `services\whatsapp_bridge_service.py`
- **Classe `WhatsAppBridgeService`**
  - *Doc*: Controlador de comunicação com a Ponte Node.js (Venom-bot).
  - *Métodos*: __init__

#### 📜 `services\whatsapp_manager_service.py`
- **Classe `WhatsAppManagerService`**
  - *Doc*: Controlador de Negócio para instâncias de WhatsApp no Tenant.
  - *Métodos*: get_or_create_instance

### 📁 Módulo: `WORKERS`
#### 📜 `workers\ack_worker.py`
- **Classe `AckWorker`**
  - *Doc*: Worker que processa confirmações de recebimento (ACKs) de mensagens do provider.

#### 📜 `workers\campaign_worker.py`
- **Classe `CampaignWorker`**
  - *Doc*: Worker que processa campanhas em segundo plano.

#### 📜 `workers\flow_worker.py`
- **Classe `FlowWorker`**
  - *Doc*: Worker que escuta mensagens do RabbitMQ e processa através da FlowEngine.

#### 📜 `workers\outgoing_worker.py`
- **Classe `OutgoingMessageWorker`**
  - *Doc*: Worker que consome a fila de mensagens de saída e efetiva o envio

## 🟢 4. Microserviço Node.js (WhatsApp Bridge Baileys)

Responsável pela comunicação via WebSockets com a rede WhatsApp.

- **Script `index.js`**: Motor de integração de instâncias Baileys/Socket.io ligado ao sistema via Redis/RabbitMQ.

- **Script `test_send.js`**: Motor de integração de instâncias Baileys/Socket.io ligado ao sistema via Redis/RabbitMQ.
