# Roadmap de Desenvolvimento - MVP 🗺️

Este roadmap detalha as 7 Sprints necessárias para construir o MVP funcional da plataforma SaaS OmniChannel.

---

## ✅ Sprint 1: Setup Arquitetural (Concluída)
- Estrutura de Solution e Projetos (DDD + Clean Arch).
- Setup Docker (PostgreSQL, Redis, RabbitMQ).
- Pipeline de CI inicial.
- Organização do BuildingBlocks.

## ✅ Sprint 2: Identity & Multi-Tenant Core (Concluída)
- Autenticação JWT e RBAC.
- Middleware TenantResolver.
- Cadastro de Usuários com TenantId.
- Seed do Admin Master.

## ✅ Sprint 3: Messaging Core (Concluída)
- Entidades Conversation, Message e Participant.
- Integração com RabbitMQ (MassTransit).
- Persistência em PostgreSQL.
- API interna de envio de mensagens.

## ✅ Sprint 4: Channel Gateway (WhatsApp) (Concluída)
- Abstração `IChannelProvider`.
- Integração com provedor de WhatsApp (Meta API ou Webhook).
- Processador de eventos de mensagens recebidas.
- Atualização de status (Enviado/Entregue).

## ✅ Sprint 5: Chat UI & Real-time Inbox (Concluída)
- Interface Web para atendimento humano (Premium Glassmorphism).
- Real-time com SignalR (atualização sem refresh).
- Listagem dinâmica de contatos e histórico.
- Transferência de conversa entre atendentes.

## ✅ Sprint 6: Flow Engine & Bot Basic (Concluída)
- Motor de regras simples para respostas automáticas.
- Fluxo de saudação e menu persistente.
- Lógica de transbordo (bot -> humano).
- Gerenciamento de Tags em contatos.

## ✅ Sprint 7: Billing, White-Label & Launch (Concluída)
- Validação de limites por plano (Lite, Pro, Enterprise).
- Customização de Logo e Cores por Tenant (White-Label).
- Dashboards de volume de mensagens.
- Testes de carga e deploy de produção nas nuvens (Azure/AWS).

---

## 🎉 MVP CONCLUÍDO + AI INTEGRATED! 🚀
O sistema agora possui a base completa para operação SaaS Omnichannel com inteligência artificial.
- Identidade & Multi-Tenancy
- Messaging Core & Gateway
- Chat Real-time (UI Premium)
- Automação (Flow Engine + AI Service)
- Billing & White-Label

**Próximos Passos (Evolução):**
1. Integração real com OpenAI/Gemini (trocar o Mock pelo HttpClient).
2. Dashboards avançados de Analytics.
3. Aplicativo Mobile para atendentes.
