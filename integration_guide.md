# Guia Definitivo de Integração: FastAPI Backend ↔ Vue.js Frontend

Este documento serve como o manual técnico oficial para a integração entre o novo ecossistema **Python/FastAPI** e a interface **Vue.js (ChatUI)**. Ele detalha todas as rotas, protocolos de comunicação e padrões de implementação necessários para manter a plataforma performática e segura.

---

## 🏗️ 1. Arquitetura de Comunicação e Segurança

A plataforma utiliza um modelo de **Single Point of Entry** via Nginx (HTTPS) para o roteamento centralizado.

### Pontos de Extremidade (Endpoints)
- **Base API**: `https://localhost/api/v1`
- **WebSocket (Real-time)**: `wss://localhost/api/v1/ws`
- **Mídia Estática**: `https://localhost/uploads/`

### Estratégia de Autenticação (JWT)
O Frontend deve obter um token JWT no login e enviá-lo em todas as requisições subsequentes no header:
`Authorization: Bearer <TOKEN>`

> [!IMPORTANT]
> Para conexões **WebSocket**, como navegadores não permitem headers customizados na conexão direta, o token é enviado via **Query Parameter**: `wss://localhost/api/v1/ws?token=<JWT>`.

---

## 🔐 2. Autenticação e Gestão de Perfil (`/auth`)

Módulo responsável pelo controle de acesso e isolamento de dados (Multi-tenancy).

### Rotas Principais

| Rota | Método | Descrição |
| :--- | :--- | :--- |
| `/auth/login` | `POST` | Autenticação via `username` (email) e `password`. Retorna o JWT. |
| `/auth/register` | `POST` | Registro de novo usuário e criação automática de um novo **Tenant ID**. |
| `/auth/me` | `GET` | Retorna os dados do usuário logado (Contexto de Dashboard). |
| `/auth/change-password` | `POST` | Atualização segura de senha com validação de complexidade. |

### Exemplo de Fluxo (Frontend)
No Vue.js, utilize interceptadores do Axios para injetar o token e tratar erros `401 Unauthorized` redirecionando para o Login.

```javascript
// axios-setup.js
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 🤖 3. Canais e Bot Control (`/bot`)

Gerencia as instâncias do WhatsApp via Bridge Node.js (Venom/Venom-Bot).

### Ciclo de Vida do Bot

1.  **Sincronização**: O UI chama `GET /bot/` para verificar se já existe uma instância ativa.
2.  **Inicialização**: Caso esteja desconectado, chama `POST /bot/start`.
3.  **QR Code**: O backend responde com o estado `QRCODE` e o campo `qrcode_base64`. O Frontend deve renderizar esta imagem em tempo real.
4.  **Health Check**: A API Python monitora via background task a saúde da conexão a cada 30s.

### Esquema de Resposta (`WhatsAppInstance`)
```json
{
  "session_name": "tenant_8F9D2A",
  "status": "connected",
  "qrcode_base64": "data:image/png;base64,...",
  "battery_level": 85,
  "phone_number": "5511999999999"
}
```

---

## 🧠 4. Engine de Fluxos (`/flows`)

Permite a criação e persistência de automações visuais (FlowBuilder).

### Operações CRUD

- **Listar**: `GET /api/v1/flows/` (Filtra automaticamente pelo Tenant do usuário logado).
- **Criar/Salvar**: `POST /api/v1/flows/` enviando o JSON exportado pelo designer visual.
- **Node Parsing**: O Backend valida se o JSON possui nós críticos (Start, SendMessage, Condition).

> [!TIP]
> O Flow Engine em Python suporta variáveis dinâmicas. Ao configurar um nó no Frontend, use a sintaxe `{{variavel}}` para que o backend faça o mapeamento automático durante a execução do chat.

---

## 💬 5. Chat em Tempo Real e WebSockets (`/ws`)

A "ponte" que conecta o agente humano ao cliente final via RabbitMQ.

### Fluxo de Mensagem (RabbitMQ ↔ WebSocket)

1.  Um evento de mensagem chega via Webhook do WhatsApp.
2.  O **Channel Gateway** normaliza a mensagem e publica no RabbitMQ.
3.  O **WebSocket Bridge** consome a fila e dispara o JSON para a conexão do Agente específico no Frontend.

### Formato de Evento WebSocket (JSON)
```json
{
  "type": "NEW_MESSAGE",
  "data": {
    "from": "5511988887777",
    "body": "Olá, gostaria de suporte!",
    "timestamp": "2026-03-08T17:30:00Z",
    "direction": "incoming"
  }
}
```

### Implementação Vue.js (WebSocket Manager)
```javascript
const connectWS = (token) => {
  const ws = new WebSocket(`wss://localhost/api/v1/ws?token=${token}`);
  ws.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    store.dispatch('handleNewEvent', payload);
  };
};
```

---

## 💳 6. Faturamento e Controle de Quotas (`/billing`)

Garante a monetização e limites de uso do SaaS.

| Endpoint | Objetivo |
| :--- | :--- |
| `/billing/subscription` | Verifica o plano atual do Tenant (Free, Pro, Enterprise). |
| `/billing/usage` | Retorna o consumo atual de mensagens e robôs contratados. |
| `/billing/checkout` | Gera link de pagamento para upgrade de plano via Webhooks. |

---

## 📂 7. Gerenciador de Mídia e Armazenamento

Todos os arquivos (imagens de chat, áudios, PDFs) são servidos por:
`GET https://localhost/uploads/{tenant_id}/{filename}`

Ao enviar um arquivo pelo chat:
1.  Frontend faz `POST /api/v1/bot/upload`.
2.  Backend retorna a URL pública concatenada.
3.  O Bot do WhatsApp utiliza essa URL para fazer o download e repassar ao cliente.

---

## 🛠️ Melhores Práticas de Integração

1.  **X-Tenant-Id**: Embora o Backend extraia o Tenant do JWT, em requisições administrativas de SuperAdmin, envie explicitamente o Header `X-Tenant-Id` para alternar o contexto de visualização.
2.  **Retry Logic**: Implemente **Exponential Backoff** nas tentativas de reconexão do WebSocket no Frontend para evitar sobrecarga no servidor após micro-quedas de rede.
3.  **Loading States**: Sempre exiba skeletons ou spinners ao interagir com o Flow Engine, dado que a validação de fluxos complexos no MongoDB pode levar mais de 200ms.

---
*Este documento foi gerado automaticamente pela engenharia de migração e deve ser mantido atualizado a cada nova sprint de funcionalidade.*
