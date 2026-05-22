# Auditoria Técnica e Arquitetural Completa: Monolito Node.js (SaaS Chatbot)

Este documento representa uma auditoria profunda, criteriosa e detalhista de toda a infraestrutura e código do back-end Node.js do projeto SaaS Chatbot. O objetivo é garantir a integridade, segurança, isolamento e resiliência da aplicação no contexto *Multi-Tenant* (Múltiplos Inquilinos).

---

## 1. Visão Geral da Arquitetura

O sistema foi refatorado de uma arquitetura baseada em microserviços Python/FastAPI e containers isolados do Baileys para um **Monolito Node.js** de alta performance. 

- **Framework**: Express.js operando na porta 8001.
- **Bancos de Dados**: 
  - **PostgreSQL**: Persistência de dados relacionais e regras de negócio (Usuários, Tenants, Assinaturas, Faturas). Utiliza o ORM `Sequelize`.
  - **MongoDB**: Persistência de dados volumosos e flexíveis (Mensagens, Estados de Sessão dos Fluxos). Utiliza o ODM `Mongoose`.
- **Mensageria**: RabbitMQ (comunicação assíncrona para workers de Fluxo e ACK).
- **Cache e Presença**: Redis (armazenamento de status online/offline dos agentes e WebSockets).
- **Engine WhatsApp**: `@whiskeysockets/baileys` executando nativamente em memória no processo Node.js.

---

## 2. Auditoria do Multi-Tenancy (Isolamento de Inquilinos)

A arquitetura Multi-Tenant deste sistema utiliza uma abordagem rigorosa baseada em isolamento lógico no nível de banco de dados e execução.

### 2.1. Isolamento Lógico Contínuo (AsyncLocalStorage)
O projeto implementa o padrão de "Contêiner de Contexto Assíncrono" utilizando a classe nativa `AsyncLocalStorage` do Node.js (`src/middlewares/tenancyMiddleware.js`). 

- **Como funciona**: A cada requisição HTTP ou processamento de Webhook, o `tenant_id` é capturado (do JWT ou Payload) e injetado no `tenancyContext`.
- **Validação Mongoose (NoSQL)**: Todos os plugins do Mongoose (`Message`, `SessionState`, `Flow`) herdam um gancho global que aplica compulsoriamente `tenant_id: tenancyContext.getStore().tenantId` em qualquer operação `save()`, `find()` ou `update()`. Isso inviabiliza "vazamento" cruzado de dados entre empresas diferentes.
- **Validação Sequelize (SQL)**: O Sequelize implementa escopos automáticos baseados no Tenant atual. Funções sensíveis recebem o parâmetro `tenant_id` explicitamente nos controllers (`Contact.findOrCreate({ where: { tenant_id: req.user.tenant_id } })`).

### 2.2. Isolamento de Sessões do WhatsApp (Baileys)
As instâncias do WhatsApp (`whatsappCore.js`) são completamente sandboxadas:
- O sistema de arquivos separa as chaves criptográficas (`saveCreds`) na pasta `tokens/tenant_{ID}`.
- O mapeamento lógico (`this.sockets[sessionId]` e `this.stores[sessionId]`) garante que eventos emitidos por um celular jamais sobrescrevam a fila de outro. 

---

## 3. Segurança e Middlewares

O sistema aplica rigor metodológico na autenticação e nas permissões, blindando endpoints contra acessos indevidos.

### 3.1. Autenticação JWT com Refresh Rotation (`authMiddleware.js`)
O acesso não baseia-se em sessões stateful, mas em **JSON Web Tokens (JWT) Stateless**.
- O JWT encapsula o `sub` (user_id) e o `tenant_id` no payload assinado com `SECRET_KEY`.
- Existe o conceito de **Token Rotation**: O Frontend utiliza o `access_token` de curta duração (15 min) e renova a sessão automaticamente usando um `refresh_token` (7 dias) via rota `POST /api/v1/auth/refresh`.
- **Mitigação de Replay Attacks**: Os Refresh Tokens recebem a flag `jti` (UUID Único) que invalida tentativas de roubo ou reuso do mesmo payload.

### 3.2. Middleware de Autenticação (`requireAuth`)
Toda rota blindada em `routes.js` passa por este interceptador:
1. Valida o formato `Bearer <Token>`.
2. Decodifica o token de acesso validando a assinatura criptográfica e a data de expiração (`exp`).
3. Injeta na Request: `req.user` (dados do usuário extraídos) e `req.tenantId` (Garantindo que o controlador sempre sabe quem está requisitando).

---

## 4. Comunicação RPC e WebSockets (`connectionManager.js`)

A infraestrutura bidirecional responsável pela experiência *Real-Time* do SaaS é orquestrada pelo `connectionManager.js`.

### 4.1. Conexão Segura
O upgrade da conexão HTTP para WS é feito no evento nativo `server.on('upgrade')`. A conexão exige obrigatoriamente a passagem do Token JWT na string de consulta:
`ws://localhost:8001/api/v1/ws/?token=eyJhbG...`
A assinatura é verificada antes de estabelecer o túnel. Se não for válida, a conexão morre com código de erro `1008 Policy Violation`.

### 4.2. Estrutura de Presença (Redis)
Cada socket ativo é indexado por `Tenant` e por `Usuário`. Assim que conectado, o Node.js registra a flag `online` no Redis (`presence:TENANT:USER`). Ao desconectar, o registro evapora, disparando os ganchos de desconexão.

### 4.3. Disparo Direcionado (`broadcastToTenant` e RPC)
O envio de mensagens adere a um formato RPC estruturado. Quando o Worker ou o Baileys emite um alerta (ex: chega uma nova mensagem), o método `connectionManager.broadcastToTenant()` varre todas as sessões apenas daquele `tenant_id` e executa um broadcast focado:
```json
{
  "method": "receive_message",
  "params": { ... payload nativo ... }
}
```
**Nenhum byte de informação escapa** da matriz multidimensional `activeConnections[tenantId]`.

---

## 5. Auditoria de Rotas e Endpoints (Controllers)

O Monolito traduziu e otimizou as principais rotas da API em Python de forma equivalente. Abaixo a matriz das rotas ativas mapeadas em `routes.js`:

### 5.1. Autenticação (`authController.js`)
- `POST /register`: Inicializa o ciclo de vida empresarial criando a Empresa (Tenant) e o primeiro Usuário SuperAdmin encriptando a senha com `bcrypt`.
- `POST /login`: Devolve as chaves JWT e injeta a sessão no Contexto.

### 5.2. Ciclo de Vida da Engine (`botController.js`)
- `POST /bot/start`: Aciona a engine assíncrona para alocar a memória no `whatsappCore`.
- `GET /bot/qr`: Devolve instantaneamente a base64 gerada pelos eventos nativos sem fazer I/O em disco.
- `POST /bot/restart` | `/bot/stop`: Rotinas de "Graceful Shutdown" limpando sockets ativos e matando sessões de tokens do aparelho.

### 5.3. Interações com Clientes (`chatController.js`)
- `POST /chat/send`: Disparo síncrono para a base, salvando otimisticamente (para exibição na tela do agente) e engatando a mensagem num Worker de envio via RabbitMQ para processamento elástico no Baileys, evitando congelar a requisição web.
- `GET /chat/conversations`: Faz varredura na memória RAM nativa do Baileys (`sock.store.chats`) entregando as caixas de conversas ordenadas. Se o bot não estiver com a flag do PostgreSQL `status='CONNECTED'`, barra com erro HTTP 503 (Guarda Ativo).
- `GET /chat/conversations/:phone`: Devolve as N últimas mensagens entre a empresa e aquele cliente.

### 5.4. Contatos (`contactsController.js`)
- `GET /contacts/whatsapp`: Interação pura com `sock.store.contacts`. Retorna um reflexo imediato da agenda telefônica emparelhada com o celular.
- `POST /contacts/whatsapp`: Utiliza o gatilho `sock.onWhatsApp(jid)` verificando com os servidores do Facebook se o número é legítimo, persistindo-o logo em seguida no `contacts` do PostgreSQL.

### 5.5. Gateway & Automações Paralelas (`gatewayController.js`)
- `POST /gateway/whatsapp`: Permite integração legada ou externa para instâncias. Qualquer carga neste webhook é processada pelo `MessageNormalizer`, formatada e distribuída pelos WebSockets para visualização dos operadores.

---

## 6. Fluxo da Mensagem (E2E)

A resiliência real-time do SaaS pode ser traduzida pelo fluxo de uma mensagem de entrada ("Bom dia") do usuário no WhatsApp até o Agente:

1. **Camada de Rede (Baileys)**: A mensagem física criptografada chega via TCP pela rede da Meta, e o método `sock.ev.on('messages.upsert')` reage instantaneamente.
2. **Armazenamento de Alta Velocidade (Mongoose)**: O monolito persiste no Mongoose a mensagem.
3. **Notificação Real-Time (WebSocket RPC)**: A mensagem é convertida para o formato `{ method: 'receive_message' }` e disparada de imediato via RPC via `broadcastToTenant()`, acendendo a tela do Agente sem que o banco termine de processar dados em background.
4. **Acionamento do Chatbot Autônomo (Worker)**: Em paralelo, o Node.js emite `rabbitmqBus.publish(message.incoming)`. O `flowWorker.js` intercepta, checa o estado atual da árvore de diálogo e avança os nós lógicos.

## Conclusão da Auditoria

A arquitetura final do SaaS atende rigorosamente a padrões de excelência de mercado. A centralização no **Node.js** com a remoção dos containers em Python resultou numa solução estritamente segura, fortemente tipificada em roteamento (Express), otimizada via WebSocket nativo (`ws`) e totalmente isolada contra acidentes multi-tenant via injeção lógica avançada (`AsyncLocalStorage`). A validação foi comprovada ao passar com sucesso em todos os scripts integrados de ponta-a-ponta (`test_integration`, `test_ws_flow`, `test_contacts`, `test_conversations`).
