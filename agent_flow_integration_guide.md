# Bluebook: Guia de Integração Agente-Flow (v2.1)

Este guia detalha a especificação técnica para a criação, orquestração e gestão de agentes através do motor de fluxos (**FlowEngine**) do SaaS Chatbot.

---

## 1. Rota de Criação de Agente (Fluxo)

A criação de um novo agente (ou fluxo de automação) é feita através de uma requisição **POST** enviada ao MongoDB (via FastAPI/Beanie).

**Endpoint**: `POST /api/v1/flows/`
**Headers**:
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`
- `X-Tenant-ID: <ID_DO_TENANT>`

---

## 2. Anatomia do Formulário (Request Body)

O corpo da requisição deve seguir rigorosamente a estrutura do objeto `FlowCreate`.

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `name` | String | Sim | Nome identificador do agente/fluxo. |
| `description` | String | Não | Breve descrição da finalidade do agente. |
| `nodes` | Array[Node] | Sim | Lista de blocos lógicos do fluxo (Botões, Mensagens, etc). |
| `edges` | Array[Edge] | Sim | Lista de conexões que guiam a jornada do usuário. |
| `trigger_keywords`| Array[Str] | Não | Palavras que ativam este agente automaticamente. |

### Estrutura de um Nó (`Node`)
Cada nó no array `nodes` possui:
- `id` (String): Identificador único do nó no grafo.
- `type` (Enum): `input`, `message`, `ai`, `handover`, `condition`, `wait`, `ab_split`.
- `label` (String): Título visível no construtor.
- `position` (Object): `{ "x": float, "y": float }`.
- `data` (Object): Configurações específicas do tipo de nó (ex: texto da mensagem).

---

## 3. Exemplo Prático de Payload (Cookbook)

Abaixo, um exemplo de JSON pronto para ser enviado pelo Front-end:

```json
{
  "name": "Agente de Boas-vindas Vendas",
  "description": "Fluxo inicial para triagem de leads de vendas.",
  "nodes": [
    {
      "id": "start_1",
      "type": "input",
      "label": "Início",
      "position": { "x": 100, "y": 100 },
      "data": {}
    },
    {
      "id": "msg_welcome",
      "type": "message",
      "label": "Boas-vindas",
      "position": { "x": 100, "y": 250 },
      "data": { "text": "Olá! Seja bem-vindo à nossa área de vendas. Qual seu interesse?" }
    },
    {
      "id": "handover_team",
      "type": "handover",
      "label": "Transferir para Suporte",
      "position": { "x": 350, "y": 400 },
      "data": { "departmentId": "financeiro_01" }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "start_1",
      "target": "msg_welcome"
    },
    {
      "id": "e2-3",
      "source": "msg_welcome",
      "target": "handover_team",
      "sourceHandle": "btn_falar_com_atendente"
    }
  ],
  "trigger_keywords": ["comprar", "venda", "ajuda"]
}
```

---

## 4. Matriz de Respostas do Backend

### ✅ Sucesso (201 Created)
Retorna o objeto persistido no MongoDB, incluindo o campo `id` (ObjectId) gerado.

```json
{
  "id": "65b8f2c...", 
  "name": "Agente de Boas-vindas Vendas",
  "is_active": true,
  "updated_at": "2026-03-18T15:40:00Z",
  "nodes": [...],
  "edges": [...]
}
```

### ❌ Erro de Validação (422 Unprocessable Entity)
Ocorre quando o formato do JSON está incorreto ou faltam campos obrigatórios.

```json
{
  "detail": [
    {
      "loc": ["body", "nodes", 0, "type"],
      "msg": "value is not a valid enumeration member; permitted: 'input', 'message'...",
      "type": "type_error.enum"
    }
  ]
}
```

### ❌ Falha de Sistema (500 Internal Server Error)
Erro genérico em caso de falha de conexão com o MongoDB ou erro lógico no backend.

---

## 5. Orquestração e Gestão

### Atualização (PATCH)
Para alterar apenas partes do agente (ex: desativar ou mudar o nome):
- **Endpoint**: `PATCH /api/v1/flows/{id}`
- **Payload**: Somente os campos a serem alterados.

### Exclusão (DELETE)
Para remover o agente permanentemente:
- **Endpoint**: `DELETE /api/v1/flows/{id}`

---

> [!NOTE]
> **Dica de Performance**: Ao carregar múltiplos agentes no painel de controle, utilize o endpoint `GET /api/v1/flows/` para buscar a lista resumida e exibir apenas os nomes e status antes de carregar o grafo completo.
