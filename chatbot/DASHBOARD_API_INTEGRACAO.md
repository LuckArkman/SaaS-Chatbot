# Dashboard – O que estava fixo e o que foi integrado à API

Sistema de envio de mensagens via WhatsApp (API em `{API_BASE_URL}/docs`, ex.: `http://76.13.168.200:8001/docs`). O login já funcionava; as alterações abaixo removem dados fixos e passam a usar a API.

---

## Lista do que estava fixo e foi corrigido

### 1. **Home (Conversas)**
- **Lista de conversas**: antes uma única conversa fixa "UTalk Chatbot". Agora a lista vem da API (`/api/v1/contacts/`); cada contato aparece como uma conversa.
- **Mensagens do chat**: antes 6 mensagens fixas. Agora o histórico é carregado pela API (`/api/v1/chat/history/{conversation_id}`) ao clicar na conversa.
- **Envio de mensagem**: antes só interface. Agora envia via API (`POST /api/v1/chat/send`) com `conversation_id` e `content`.
- **Nome do usuário**: antes "Alexandre Campos" fixo. Agora usa o retorno de `/api/v1/auth/me` (fullName / full_name / email).
- **Modal "Nova conversa"**: antes um contato fixo "UTalk Chatbot" +55 1194221-6152. Agora a lista de contatos vem da API (mesmo endpoint de contatos).
- **Badge da aba "Entrada"**: antes "1" fixo. Agora mostra o total de contatos/conversas.

### 2. **Contatos**
- **Lista e total**: antes um único contato fixo "Umbler Chatbot" +55 11 94221-6152 e título "Contatos 1". Agora a lista e o número vêm da API (`/api/v1/contacts/`).
- **Ação "Visualizar"**: agora leva para a conversa na Home com `?conversation_id=...`.

### 3. **Backend**
- **Controllers**: `HomeController` e `ContatosController` só renderizavam a view. Agora chamam `OmniChannelApiClient` para buscar contatos e (na Home) usuário logado.
- **Novos endpoints JSON** (para o front chamar em AJAX):
  - `GET /api/omni/contacts` – lista de contatos
  - `GET /api/omni/chat/history?conversation_id=...` – histórico do chat
  - `POST /api/omni/chat/send` – envia mensagem (body: `{ "conversation_id": "...", "content": "..." }`)
  - `GET /api/omni/auth/me` – dados do usuário logado
  - `GET /api/omni/bot/status` – status do bot (disponível para uso futuro)

---

## O que ainda pode ser ajustado conforme a API

A API SaaS pode usar nomes de campos diferentes (ver documentação em `/docs` da instância). O código já tenta vários nomes comuns:

- **Contato**: `name`, `full_name`, `displayName`; `phone`, `phone_number`, `number`; `id`, `_id`.
- **Resposta de contatos**: lista em `data.items`, `data.data` ou array direto; total em `data.total`.
- **Histórico de chat**: mensagens em `items`, `messages`, `data` ou array; em cada mensagem: `content`, `text`, `body`; `sender`, `from`; `direction` / `from_me` para identificar se é do usuário.

Se a documentação Swagger da sua API usar outros nomes, basta alinhar nesses pontos (views e/ou `ApiOmniController`).

---

## Resumo técnico

| Área        | Antes              | Depois                          |
|------------|--------------------|----------------------------------|
| Home – lista | 1 conversa fixa   | Contatos da API                 |
| Home – chat  | Mensagens fixas   | Histórico via API + envio via API |
| Home – usuário | Nome fixo       | `/api/v1/auth/me`               |
| Contatos   | 1 contato fixo     | Lista e total da API            |
| AJAX       | Nenhum             | Rotas em `/api/omni/*`          |

Login continua como já estava (sessão com `omni_token` após login na API).
