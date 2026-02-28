# 🌐 Guia de Integração Profundo: Front-end & Microserviços

Este guia expandido detalha a arquitetura, segurança e padrões de implementação para integrar um front-end moderno (Vue 3 / Next.js) com o ecossistema SaaS Chatbot.

---

## 🏗️ 1. Arquitetura de Comunicação

O front-end **nunca** deve falar diretamente com os microserviços específicos. Toda a comunicação é mediada pelo **Identity API (Gateway)**.

- **Gateway URL (Local/Docker)**: `http://localhost:5051`
- **Gateway URL (Produção)**: `https://api.seusass.com`

### Fluxo de Requisição:
1. Front-end envia requisição com JWT no header.
2. Identity API valida o JWT.
3. Identity API resolve o `TenantId` do usuário.
4. Identity API encaminha a requisição para o microserviço interno (FlowEngine, Messaging, etc) injetando o contexto do Tenant.

---

## 🔒 2. Segurança e Autenticação

### Gestão de Tokens (JWT)
- **Armazenamento Recomendado**: 
  - **Vue**: Use **HttpOnly Cookies** para o Refresh Token e mantenha o Access Token em memória (State). 
  - **Next.js**: Use o padrão **BFF (Backend for Frontend)** via NextAuth.js para isolar os tokens do lado do cliente.
- **Autorização**: Header `Authorization: Bearer <TOKEN>`.

### Refresh Token Loop
Implemente uma lógica de "Silent Refresh". Se uma requisição falhar com `401 Unauthorized`, o interceptor deve:
1. Pausar todas as requisições pendentes.
2. Chamar o endpoint de refresh.
3. Repetir a requisição original com o novo token.

---

## 📞 3. Cliente API (Axios Boilerplate)

Recomendamos centralizar a lógica de API em um serviço dedicado.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:5051',
  timeout: 10000,
});

// Interceptor de Requisição: Injetar Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token'); // Simplificado para o exemplo
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Resposta: Feedback Global de Erro
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirecionar para login ou disparar refresh
    }
    if (error.response?.status === 422) {
      console.error('Erro de Validação:', error.response.data.errors);
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📂 4. Referência Detalhada de Endpoints

### 4.1 Gestão de Fluxos (Flow Engine)

| Endpoint | Payload (POST/PUT) | Resposta Esperada |
| :--- | :--- | :--- |
| `GET /api/FlowEngine/flows` | N/A | `Array<FlowModel>` |
| `POST /api/FlowEngine/flows` | `FlowDefinition` (ver abaixo) | `FlowModel` atualizado |

**Contrato do FlowStep (Nó do Grafo):**
```typescript
interface FlowStep {
  id: string; // GUID
  title: string; // Ex: "Cérebro IA"
  type: "Message" | "Ai" | "Handover" | "InternalModel";
  content: string; // Texto da msg ou System Prompt
  x: number; // Coordenada Visual
  y: number; // Coordenada Visual
  nextStepId?: string; // Próximo nó na sequência
  fallbackStepId?: string; // Caminho de erro/segunda opção
  metadata: Record<string, string>; // Dados específicos do tipo de nó
}
```

### 4.2 Chat Real-time (Messaging)

Para mensagens, o front-end deve usar **SignalR** para evitar polling excessivo.

- **Hub URL**: `http://localhost:5055/chatHub`
- **Eventos para Escutar**:
  - `ReceiveMessage(message: MessageModel)`: Quando uma nova mensagem chega.
  - `ConversationUpdated()`: Quando o status de uma conversa muda (ex: Handover).

---

## �️ 5. Padrões de Interface (UX/UI)

### Editor de Fluxos (VueDraggable ou Next.js + Reactflow)
- **Auto-save**: Implemente um "Debounce" de 2 segundos. Ao mover um nó, espere o usuário parar de interagir por 2s e envie apenas as coordenadas alteradas para a API.
- **Validação de Loop**: O front-end deve impedir ciclicidade infinita nos fluxos sem um nó de "Input" ou tempo de espera intermediário.

### Tratamento Global de Erros (Toast/Snackbar)
- **Status 500**: "Erro interno no servidor. Nossa equipe já foi notificada."
- **Status 403**: "Seu plano atual não permite esta funcionalidade. Faça upgrade agora."
- **Status 422**: Exibir erros específicos nos campos do formulário.

---

## 🧪 6. Estratégia de Testes

- **Mocking**: Use o **MSW (Mock Service Worker)** para simular as respostas da API nos testes de unidade do Vue/Next.js sem precisar do Docker rodando.
- **E2E**: Use **Cypress** ou **Playwright** para testar o fluxo completo de "Criar Agente -> Salvar -> Verificar na Lista".

---

> [!IMPORTANT]
> **Consistência de Tipos**: Use o **Swagger** (`http://localhost:5051/swagger`) como fonte da verdade. Gere seus tipos Typescript automaticamente a partir do arquivo `swagger.json` para evitar bugs de integração.
