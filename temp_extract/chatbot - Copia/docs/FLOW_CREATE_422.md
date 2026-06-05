# FlowCreate – O que enviamos e o que a API retorna (422)

## O que o front envia (POST /api/omni/flows → POST /api/v1/flows/)

Exemplo de JSON enviado ao criar um novo chatbot:

```json
{
  "name": "Nome digitado no formulário",
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
      "data": { "text": "Olá! Como posso ajudar?" }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "start_1",
      "target": "msg_welcome"
    }
  ],
  "trigger_keywords": []
}
```

- **description**: só é enviado se o usuário preencher (senão a chave é omitida).
- **Node types** usados: `input`, `message` (Bluebook: permitidos `input`, `message`, `ai`, `handover`, `condition`, `wait`, `ab_split`).

---

## O que a API retorna em 422 (Validation Error)

Formato típico FastAPI:

```json
{
  "detail": [
    {
      "loc": ["body", "caminho", "do", "campo"],
      "msg": "mensagem de erro",
      "type": "tipo_do_erro"
    }
  ]
}
```

O nosso backend repassa esse `detail` na resposta. No modal "Novo chatbot", a mensagem de erro exibida é montada a partir de `detail` (cada `loc` + `msg`).

---

## Como corrigir

1. **Veja a mensagem no modal** depois de clicar em "Criar agente" quando der 422 – ela deve mostrar algo como `body.nodes.0.type – value is not a valid enumeration member...`.
2. **Confira o schema no Swagger** da API (`/docs` ou `/openapi.json`): modelos **FlowCreate**, **FlowNode**, **FlowEdge**, **Position**, **NodeType**.
3. Ajustes comuns:
   - **type** do nó: valor exato do enum (ex.: `input` vs `start`).
   - **position**: às vezes a API espera `position` com chaves em snake_case ou outro nome.
   - **data**: para `type: "message"`, às vezes é obrigatório um campo específico (ex.: `content` em vez de `text`).
   - **edges**: às vezes é obrigatório `source_handle` (ou `source_handle` em snake_case).

Quando tiver um exemplo do **detail** que a API retornou (ou um print da mensagem de erro no modal), dá para alinhar o payload exatamente ao schema da API.
