# Rotas da aplicação UTalk (chatbotEdmilson)

Base URL exemplo: `http://51.161.45.53/chatbotEdmilson/public`

## Cadastro e login (públicas)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/` | GET | Redireciona para a tela de login |
| `/login` | GET | Página de login |
| `/login` | POST | Envio do formulário de login (e-mail, senha) |
| **`/register`** | **GET** | **Página de cadastro (novo usuário)** |
| **`/register`** | **POST** | **Envio do formulário de cadastro** |
| `/logout` | GET | Encerra sessão e redireciona para login |
| **`/dev/create-programador`** | **GET** | **Cria usuário de teste (programador@teste.com / Senha123!)** – sem login |
| **`/programador/api`** | **GET** | **Consola do programador** — catálogo OpenAPI (`/api/v1/openapi.json`) + chamadas à SaaS · **só** utilizador programador |
| **`/testes-api`** | **GET** | **Testes do ciclo do bot + suítes de mídia WhatsApp** — **só** utilizador programador |
| **`POST /api/omni/storage/upload`** | **POST** | Upload de mídia → SaaS `POST /api/v1/storage/upload` |
| **`/api/omni/openapi-spec`** | **GET** | JSON `{ openapi, fetched_status }` — **só programador** |
| **`/api/omni/dev/call`** | **POST** | Encaminha `{ method, path, body?, noBody?, formUrlEncoded? }` para a SaaS — **só programador** |

O e-mail **programador@teste.com** (e opcionalmente `PROGRAMADOR_EMAILS` no `.env`) após login vai para **`/programador/api`** e **não** acede ao painel normal (`/home`, `/chatbots`, etc. — redireciona para a consola).

Para **cadastrar** um novo usuário, use:
- **URL:** `http://51.161.45.53/chatbotEdmilson/public/register`
- Na tela de login, o link **"Cadastre-se →"** já aponta para essa rota.

## Áreas protegidas (exigem login)

Se você acessar qualquer rota protegida sem estar logado, será redirecionado para `/login`. Por isso, ao acessar `/chatbots` sem sessão, a aplicação mostra a tela de Login.

| Rota | Descrição |
|------|-----------|
| `/home` | Conversas (chat) |
| `/contatos` | Lista de contatos |
| `/board` | Board de contatos |
| `/configuracoes` | Configurações |
| `/agentes-ia` | Agentes de IA |
| `/chatbots` | Chatbots |
| `/marketing` | Envio de campanha |
| `/relatorios` | Relatórios |
| `/notificacoes` | Notificações |
| `/suporte` | Suporte |
| `/users` | Usuários |

## API interna (JSON, exigem login)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/omni/contacts` | GET | Lista contatos (API SaaS) |
| `/api/omni/chat/history` | GET | Histórico do chat (`?conversation_id=`) |
| `/api/omni/chat/send` | POST | Envia mensagem |
| `/api/omni/auth/me` | GET | Dados do usuário logado |
| `/api/omni/bot/status` | GET | Status do bot (WhatsApp: connected, QRCODE, etc.) |
| `/api/omni/bot/qr` | GET | Obtém QR Code atual do bot (route SaaS: `/api/v1/bot/qr`) |
| `/api/omni/bot/start` | POST | Inicia/sincroniza instância WhatsApp (pode retornar QR em base64) |
| `/api/omni/bot/stop` | POST | Para a instância WhatsApp (SaaS: `POST /api/v1/bot/stop`) |
| `/api/omni/campaigns` | GET | Lista campanhas / visão da fila de envios em massa (SaaS: `GET /api/v1/campaigns/`) |
| `/api/omni/campaign` | GET | Detalhe de uma campanha (`?campaign_id=`) |
| `/api/omni/flows` | GET | Lista agentes/fluxos (FlowEngine) |
| `/api/omni/flows` | POST | Cria agente/fluxo (body: FlowCreate – nome, nodes, edges, etc.) |

**Rotas completas da API SaaS** (chamadas pelo backend, configuradas em `API_BASE_URL` no `.env`):
- Status do bot: `GET {API_BASE_URL}/api/v1/bot/` (ex.: `http://76.13.168.200:8001/api/v1/bot/`)
- Iniciar bot: `POST {API_BASE_URL}/api/v1/bot/start` (ex.: `http://76.13.168.200:8001/api/v1/bot/start`)
- Parar bot: `POST {API_BASE_URL}/api/v1/bot/stop`
- Campanhas: `GET {API_BASE_URL}/api/v1/campaigns/`
