# MVP - SaaS OmniChannel Platform 🧩

Este documento descreve as funcionalidades essenciais para o **Mínimo Produto Viável (MVP)** da plataforma, focado em entregar valor real para Administradores, Revendas e Clientes Finais.

---

## 🔑 1. Núcleo de Identidade e Multi-Tenancy
- **Isolamento de Dados**: Garantir que as mensagens e contatos de um cliente não sejam visíveis por outros.
- **Hierarquia de Contas**:
    - **Admin Master**: Gerencia revendas e configurações globais.
    - **Revenda**: Gerencia seus próprios clientes e sua marca (White Label básico).
    - **Cliente Final**: Opera o chat e configura bots.
- **Autenticação**: Login seguro via JWT com controle de acesso baseado em roles (RBAC).

## 💬 2. Mensageria e Conectividade
- **Integração WhatsApp**: Gateway funcional para envio e recebimento via webhooks.
- **Status das Mensagens**: Rastreamento de "Enviado", "Entregue" e "Lido".
- **Histórico Persistente**: Armazenamento de conversas em PostgreSQL para consulta rápida.
- **Event-Driven**: Uso de RabbitMQ para processar mensagens em segundo plano, garantindo alta disponibilidade.

## 📥 3. Chat / Inbox (Interface do Agente)
- **Caixa de Entrada**: Visualização de todas as conversas abertas.
- **Filtros Básicos**: Conversas em aberto, finalizadas ou por atendente.
- **Troca de Mensagens em Tempo Real**: Uso de SignalR para atualização instantânea do chat.
- **Notas Internas**: Possibilidade de atendentes deixarem notas privadas em conversas.

## 🤖 4. Automação (Flow Engine)
- **Saudação Automática**: Mensagem de boas-vindas programável.
- **Menu de Opções**: Fluxo simples de árvore (ex: 1. Suporte, 2. Comercial).
- **Transbordo Humano**: Se o bot não resolver, a conversa é transferida automaticamente para a fila de atendimento humano.

## 💳 5. Gestão e Faturamento (Billing)
- **Controle de Limites**: Bloqueio de novos envios caso o limite do plano seja atingido.
- **Status da Assinatura**: Bloqueio de acesso por inadimplência ou suspensão manual.
- **Planos Básicos**: Definição de pacotes (ex: Plano Lite, Plano Pro).

## 📊 6. Dashboards e Relatórios
- **Métricas de Volume**: Total de mensagens enviadas/recebidas por dia.
- **Controle de Conexões**: Status em tempo real das instâncias de WhatsApp conectadas.

---

## 🧪 Critérios de Sucesso do MVP
1. Um usuário Admin cria uma Revenda.
2. A Revenda cria um Cliente Final.
3. O Cliente Final conecta um WhatsApp.
4. Uma mensagem enviada para o WhatsApp do cliente entra no Dashboard e o Bot responde.
5. Um atendente humano assume a conversa e finaliza o atendimento.
