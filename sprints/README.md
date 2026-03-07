# Roadmap de Migração: .NET 8 para Python (FastAPI)

Este documento serve como índice para as 45 sprints de migração da arquitetura backend do SaaS Chatbot.

## Fases da Migração

### 🔹 Fase 1: Infraestrutura e Identidade (Sprints 01-05)
- [Sprint 01 - Setup do Ambiente Base Python e CI/CD](./sprint_01_setup_python_base.md)
- [Sprint 02 - Migração do Core de Autenticação (JWT/Identity)](./sprint_02_identity_auth_migration.md)
- [Sprint 03 - Implementação do Gerenciamento de Tenancy em Python](./sprint_03_tenancy_management.md)
- [Sprint 04 - API de Registro e Recuperação de Senha](./sprint_04_identity_registration_flow.md)
- [Sprint 05 - Testes de Integração e Validação de Segurança Identity](./sprint_05_identity_validation.md)

### 🔹 Fase 2: Building Blocks e Comunicação (Sprints 06-10)
- [Sprint 06 - Desenvolvimento do Middleware de Tratamento de Erros](./sprint_06_error_handling_middleware.md)
- [Sprint 07 - Core de Conectividade Redis e Caching](./sprint_07_redis_connectivity_core.md)
- [Sprint 08 - Abstração de RabbitMQ (Service Bus) em Python](./sprint_08_rabbitmq_service_bus.md)
- [Sprint 09 - Logger Centralizado e Telemetria](./sprint_09_logging_telemetry.md)
- [Sprint 10 - Validação de DTOs com Pydantic e Schemas Base](./sprint_10_dto_validation_schemas.md)

### 🔹 Fase 3: Gateway e Roteamento de Canais (Sprints 11-15)
- [Sprint 11 - Migração do Channel Gateway (Core)](./sprint_11_channel_gateway_core.md)
- [Sprint 12 - Webhooks de Integração para WhatsApp](./sprint_12_whatsapp_webhooks.md)
- [Sprint 13 - Filtros de Mensagens e Normalização de Payload](./sprint_13_message_normalization.md)
- [Sprint 14 - WebSocket Bridge para Comunicação UI](./sprint_14_websocket_bridge.md)
- [Sprint 15 - Testes de Stress do Gateway](./sprint_15_gateway_load_test.md)

### 🔹 Fase 4: Flow Engine e MongoDB (Sprints 16-20)
- [Sprint 16 - Migração da Lógica de Parsing de Nós do FlowBuilder](./sprint_16_flow_node_parsing.md)
- [Sprint 17 - Persistência de Fluxos no MongoDB (Python Beanie)](./sprint_17_mongodb_persistence_flow.md)
- [Sprint 18 - Interpretador de Condições e Variáveis de Sessão](./sprint_18_condition_interpreter.md)
- [Sprint 19 - Execução Assíncrona de Nodes e Callbacks](./sprint_19_async_node_execution.md)
- [Sprint 20 - APIs de Gerenciamento de Fluxos](./sprint_20_flow_management_api.md)

### 🔹 Fase 5: Messaging e Gerenciamento de Chat (Sprints 21-25)
- [Sprint 21 - Serviço de Chat em Tempo Real (FastAPI WebSockets)](./sprint_21_chat_service_core.md)
- [Sprint 22 - Histórico de Mensagens e Persistência de Conversas](./sprint_22_message_history.md)
- [Sprint 23 - Status de Mensagens (Enviado/Lido/Erro)](./sprint_23_message_status_tracking.md)
- [Sprint 24 - Atribuição Automática de Agentes](./sprint_24_agent_assignment_logic.md)
- [Sprint 25 - Filas de Atendimento e Distribuição](./sprint_25_support_queues.md)

### 🔹 Fase 6: WhatsApp Bot & Venom Migration (Sprints 26-30)
- [Sprint 26 - Wrapper de Controle para Instâncias Venom/Node Bridge](./sprint_26_venom_bridge_control.md)
- [Sprint 27 - Gerenciamento de QR Code via API Python](./sprint_27_qr_code_management.md)
- [Sprint 28 - Listener de Eventos de Mensagem do Bot](./sprint_28_bot_event_listeners.md)
- [Sprint 29 - Lógica de Auto-reconexão e Heartbeat](./sprint_29_bot_resiliency.md)
- [Sprint 30 - Envio de Mídias e Arquivos (Python/FastAPI Storage)](./sprint_30_media_handling.md)

### 🔹 Fase 7: Billing e Assinaturas (Sprints 31-35)
- [Sprint 31 - Core de Precificação e Planos](./sprint_31_billing_plans_core.md)
- [Sprint 32 - Integração com Gateway de Pagamento (Webhooks)](./sprint_32_payment_gateways.md)
- [Sprint 33 - Controle de Limites de Uso por Tenant](./sprint_33_usage_limits_control.md)
- [Sprint 34 - Geração de Faturas e Dashboards Financeiros](./sprint_34_invoicing_system.md)
- [Sprint 35 - Notificações de Vencimento e Renovação](./sprint_35_billing_notifications.md)

### 🔹 Fase 8: Campanhas e Automação (Sprints 36-40)
- [Sprint 36 - Agendador de Campanhas em Lote (Celery/Redis)](./sprint_36_campaign_scheduler.md)
- [Sprint 37 - Importação de Contatos e Listas de Segmentação](./sprint_37_contact_import_segmentation.md)
- [Sprint 38 - Lógica de Rate Limiting para Evitar Banimento (Delay)](./sprint_38_anti_ban_delays.md)
- [Sprint 39 - Relatórios de Conversão e Desempenho de Campanha](./sprint_39_campaign_analytics.md)
- [Sprint 40 - Ab-Testing para Fluxos de Automação](./sprint_40_ab_testing_automation.md)

### 🔹 Fase 9: Admin, UI Sync e Produção (Sprints 41-45)
- [Sprint 41 - Dashboards Administrativos (AdminDashboards Migration)](./sprint_41_admin_dashboards_python.md)
- [Sprint 42 - Integração Final Frontend (ChatUI) com APIs Python](./sprint_42_frontend_api_sync.md)
- [Sprint 43 - Otimização de Performance e Profiling](./sprint_43_performance_tuning.md)
- [Sprint 44 - Documentação Final e OpenAPI (Swagger) Patterns](./sprint_44_final_docs_openapi.md)
- [Sprint 45 - Deploy Final em Produção via PM2 / Nginx Reverse Proxy](./sprint_45_production_deploy_pm2.md)
