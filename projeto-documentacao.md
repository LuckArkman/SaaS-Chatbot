# Documentação Completa do Projeto: SaaS Chatbot Monolith

Esta é a documentação técnica oficial da versão Node.js do projeto **SaaS Chatbot Monolith**, que funciona como o backend da plataforma multi-tenant de atendimento automatizado via WhatsApp.

---

## 1. Visão Geral

O **SaaS Chatbot Monolith** é um backend robusto escrito em Node.js (migrado originalmente do Python). Ele utiliza a biblioteca **Baileys** para comunicação nativa e persistente com o WhatsApp Web, fornecendo recursos avançados como suporte Multi-Tenancy (incluindo revendedores), WebSockets em tempo real, mensageria com RabbitMQ, suporte à Inteligência Artificial (RAG), e integrações de pagamentos e campanhas.

## 2. Scripts do Projeto (`package.json`)

Os seguintes scripts npm estão disponíveis:
- **`npm run start`**: Executa a aplicação em ambiente de produção via `node server.js`.
- **`npm run dev`**: Inicia o servidor em modo de desenvolvimento usando `nodemon` para hot-reloading automático sempre que ocorrer uma alteração nos arquivos locais.

## 3. Bibliotecas e Pacotes Principais

O projeto utiliza bibliotecas modernas para gerenciar concorrência, bancos de dados relacionais e não-relacionais, e serviços externos:

- **Express.js (`express`)**: Framework web principal usado para fornecer a API REST.
- **Baileys (`@whiskeysockets/baileys`)**: Core da comunicação não oficial do WhatsApp via WebSockets.
- **Sequelize (`sequelize`, `pg`)**: ORM para PostgreSQL responsável pela gestão relacional do sistema (Usuários, Tenants, Revendas, Contatos).
- **Mongoose (`mongoose`)**: ODM para MongoDB, usado preferencialmente para dados volumosos não estruturados, como mensagens (`Message`), automações/fluxos (`Flow`) e contatos extraídos.
- **RabbitMQ (`amqplib`)**: Gestão de filas assíncronas para processamento de campanhas, fluxos e entrega de mensagens.
- **Redis (`ioredis`, `rate-limit-redis`)**: Utilizado para cache rápido, controle de sessões (`lidMap`, presenças) e rate-limiting das rotas de autenticação.
- **JSON Web Token (`jsonwebtoken`, `bcrypt`)**: Emissão de JWTs para autorização segura, e hash de senhas de usuários.
- **WebSockets (`ws`)**: Servidor nativo de WebSocket (através da classe `ConnectionManager`) para comunicação full-duplex e em tempo real com o Frontend.
- **Multer (`multer`)**: Upload de mídias para armazenamento local/s3 (arquivos, fotos, etc.).
- **Zod (`zod`)**: Utilizado (ou previsto) para validação estrita de esquemas em rotas.
- **Pino (`pino`, `pino-pretty`)**: Sistema de log super-rápido usado no console da aplicação para debugging claro e visível.

## 4. Estrutura de Diretórios (`src/`)

```text
src/
├── config/             # Conexões aos DBs (Postgres, Mongo), Redis e RabbitMQ
├── controllers/        # Controladores das rotas (a ponte entre HTTP e lógica)
├── middlewares/        # Middlewares de Express (Autenticação, Tenants, Limites)
├── models/
│   ├── sql/            # Modelos relacionais (Usuários, Contatos, Tenants)
│   └── nosql/          # Modelos de documentos (Mensagens de chat e Fluxos RAG)
├── services/           # Lógica de negócio rica 
│   ├── ai/             # Integração com LLaMA/Gemini e lógica RAG
│   ├── billing/        # Pagamentos, faturas
│   ├── flow/           # Engine de processamento de fluxos visuais do chatbot
│   ├── whatsappCore.js # O "coração" do Baileys para o WhatsApp
│   └── storageService.js # Gestão de leitura e salvamento de mídia recebida
├── utils/              # Funções de auxílio genéricas (formatadores de telefone, tokens)
├── websockets/         # connectionManager.js (gestão nativa de WebSockets)
├── workers/            # Consumidores do RabbitMQ (Workers em background)
└── routes.js           # Arquivo central definindo TODAS as rotas REST
```

## 5. Rotas da API (Visão Geral - `routes.js`)

As rotas são protegidas na sua maioria pelos middlewares `requireAuth`, `requireSuperAdmin`, ou `requireReseller`.

### 5.1. Autenticação e Conta (`/api/v1/auth`)
- `POST /login`: Recebe credenciais (email/senha) e devolve um token JWT.
- `POST /register`: Registo com login imediato (idempotente).
- `POST /provision`: Rota especial protegida por `X-Service-Key` para integrações de terceiros.
- `POST /logout` e `POST /refresh`: Encerramento ou extensão da sessão JWT.
- `DELETE /remove`: Eliminação / desativação da própria conta do usuário.

### 5.2. Gestão do Bot de WhatsApp (`/api/v1/bot`)
- `GET /`: Devolve o status atual da instância e do banco.
- `GET /qr`: Retorna o QRCode para autenticar uma nova sessão WhatsApp.
- `POST /start` | `POST /stop` | `POST /restart`: Controla o ciclo de vida do container Baileys por tenant.
- `DELETE /logout`: Desconecta permanentemente o WhatsApp do Tenant.

### 5.3. Chat e Mensagens (`/api/v1/chat`)
- `POST /send`: Envio de mensagens manuais pelo agente (Frontend) com validação de contrato.
- `GET /conversations`: Lista todas as conversas ativas do Tenant.
- `GET /history/:conversation_id`: Puxa as mensagens já salvas no MongoDB de um contato.
- `POST /transfer/:conversation_id`: Transferência da conversa para outro operador no front-end.

### 5.4. Contatos (`/api/v1/contacts`)
- `GET /` e `POST /`: Listagem e criação de contatos padrão.
- `GET /whatsapp`: Lista todos os contatos que o Baileys escaneou e guardou (trazendo a `profile_pic_url`).
- `POST /refresh-pics`: Comando em background para forçar o Baileys a buscar a foto de todos os contatos.
- `POST /import`: Rota para aceitar lote CSV ou JSON de novos contatos.

### 5.5. Inteligência Artificial (RAG) (`/api/v1/ai` | `/api/v1/rag`)
- `GET /config` e `POST /config`: Altera configurações do modelo base de IA (temperatura, prompt base).
- `POST /rag/ingest`: Injeta documentos na base de conhecimento semântico.
- `DELETE /rag/clear`: Limpa todo o conhecimento de RAG injetado.

### 5.6. Campanhas, Fluxos e Gateway
- **Campanhas** (`/v1/campaigns`): Criação, disparo e agendamento de campanhas de massa.
- **Fluxos** (`/v1/flows`): Criação do desenho lógico dos chatbots.
- **Gateway Webhook** (`/v1/gateway/webhook/:channel_type`): Para receber notificações passivas de outras plataformas e repassar ao fluxo interno.

### 5.7. Super Admin & Resellers
- **Admin (`/v1/sadmin/...`)**: Rotas exclusivas para donos do SaaS. Controle de todos os tenants, estatísticas de uso financeiro, e bloqueios emergenciais (`POST /block`).
- **Resellers (`/v1/reseller/...`)**: (Mapeados através do router correspondente) para White-labels poderem gerenciar seus clientes (`ResellerSubTenant`).

## 6. Serviços e Funções Principais Implementadas

### `whatsappCore.js` (O Motor do WhatsApp)
Este é o serviço mais fundamental. Nele, cada Tenant possui sua própria sessão de socket em memória.
- **Funções chave:**
  - `initializeSession()`: Restaura sessão do Baileys e conecta.
  - `sock.ev.on('messages.upsert')`: Escuta a chegada de mensagens. Deduplica. Resolve LIDs vs Telefones via Redis e Store Scan. Dispara a mensagem para o Frontend via Websocket e ativa o FlowEngine/IA em paralelo.
  - `sendMessage()`: Envia texto, mídia ou documento de volta para o cliente final, com tracking nativo e tratativa de timeouts (Jitter).

### `connectionManager.js` (Engine de WebSockets)
- Substitui a antiga rotina Python. Trabalha na porta padrão na rota `/api/v1/ws/`.
- Autentica a conexão WS na hora do handshake verificando a validade do JWT.
- **`isDuplicateMessage(message)`**: Contém uma rotina forte de segurança de memória usando `message_id` para bloquear que duas abas do navegador ou falhas do RabbitMQ reenviem a mesma mensagem consecutivamente e buguem o Front-end.
- **`publishEvent(tenantId, payload)`**: Envia mensagens (`receive_message`, `bot_status_update`) para todos os usuários logados naquele tenant específico (Broadcast Room).

### Flow e Automações (RabbitMQ Workers)
- Os scripts localizados na pasta `/workers` são iniciados em processos separados (ou threads internas).
- **`flowWorker.js`** / **`outgoingWorker.js`**: Lêem de forma assíncrona a fila do RabbitMQ. Se o servidor desligar inesperadamente, a mensagem não é perdida; ela fica na fila até o servidor retornar.

### `StorageService.js`
- Manipula a extração de Buffers do Baileys e converte os BLOBs (imagens, áudios `.ogg`) para caminhos acessíveis localmente na pasta `uploads/`.

---
