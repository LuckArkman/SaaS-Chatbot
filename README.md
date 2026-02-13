# SaaS OmniChannel Platform 🚀

[![.NET Core CI](https://github.com/LuckArkman/SaaS-Chatbot/actions/workflows/dotnet-ci.yml/badge.svg)](https://github.com/LuckArkman/SaaS-Chatbot/actions/workflows/dotnet-ci.yml)
![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)
![RabbitMQ](https://img.shields.io/badge/EventBus-RabbitMQ-FF6600)

Uma plataforma robusta de atendimento Omnichannel e Chatbot, desenvolvida com arquitetura de microserviços escalável, focada em modelos de revenda (SaaS) e multi-tenancy.

---

## 🏗️ Arquitetura do Sistema

A plataforma segue os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**, organizada como um monólito modular preparado para evolução em microserviços.

### Principais Componentes:
- **Identity Service**: Gestão de autenticação e perfis (Admin Master, Revenda, Cliente).
- **Tenant Service**: Gerenciamento multi-tenant, suporte a white-label e isolamento de dados.
- **Messaging Core**: O coração do processamento de mensagens e fluxos de conversa.
- **Channel Gateway**: Abstração para integração com WhatsApp, Instagram, Telegram e Facebook.
- **Flow Engine**: Motor de automação visual (Flowbuilder) para criação de Bots.
- **Billing Service**: Controle de planos, limites de mensagens e cobranças automáticas.

---

## 🛠️ Stack Tecnológica

- **Backend**: .NET 8 (C#)
- **API**: ASP.NET Core Web API (REST)
- **Documentação**: Swagger / OpenAPI
- **Persistência**: PostgreSQL via Entity Framework Core
- **Cache & Sessão**: Redis
- **Mensageria/Event-Driven**: RabbitMQ (MassTransit)
- **Infraestrutura**: Docker & Docker Compose
- **Monitoramento**: Health Checks & Logs Estruturados

---

## 📂 Estrutura da Solução

```text
SaaS.OmniChannelPlatform.sln
├── BuildingBlocks/             # Código compartilhado e utilitários de infra
├── Services/
│   ├── Identity/              # Autenticação e Autorização (JWT)
│   ├── Tenant/                # Gestão de Clientes e Revendas
│   ├── Messaging/             # Núcleo de processamento de mensagens
│   ├── ChannelGateway/        # Integração com provedores externos
│   ├── Chat/                  # Atendimento humano e histórico
│   ├── FlowEngine/            # Motor de Chatbot
│   ├── Campaign/              # Disparos em massa (Broadcast)
│   ├── Billing/               # Assinaturas e limites
│   └── Analytics/             # Relatórios e Dashboards
└── .github/workflows/         # Pipelines de CI/CD
```

---

## 🚀 Como Executar (Local)

### Pré-requisitos
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Configuração em 3 passos:

1. **Clonar o Repositório**
   ```bash
   git clone https://github.com/LuckArkman/SaaS-Chatbot.git
   cd SaaS-Chatbot
   ```

2. **Subir Infraestrutura (Docker)**
   ```bash
   docker-compose up -d
   ```
   *Isso ativará o PostgreSQL, Redis e RabbitMQ.*

3. **Executar a Aplicação**
   Você pode rodar cada serviço individualmente ou configurar o startup múltiplo no Visual Studio / Rider:
   ```bash
   dotnet restore
   dotnet build
   dotnet run --project SaaS.API
   ```

---

## 🗺️ Roadmap de Desenvolvimento

- [x] **Sprint 1: Setup Arquitetural** - Estrutura base, Docker, CI e Projetos.
- [ ] **Sprint 2: Multi-Tenancy & Identity** - Autenticação JWT e isolamento de banco.
- [ ] **Sprint 3: Messaging Gateway** - Primeira integração (WhatsApp/Telegram).
- [ ] **Sprint 4: Flow Engine** - Lógica básica de resposta automática.
- [ ] **Sprint 5: Chat & Campanhas** - Painel de atendimento e broadcast.

---

## 👤 Perfis de Acesso

1. **Admin Master**: Controle total da infraestrutura, revendas e planos globais.
2. **Revenda**: Gestão de sua própria carteira de clientes e métricas de consumo.
3. **Cliente Final**: Operação diária, atendimento e configuração de bots.

---

## 📄 Licença

Este projeto está sob a licença de uso interno para [Sua Empresa/LuckArkman]. Todos os direitos reservados.