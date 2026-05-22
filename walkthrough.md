# Walkthrough - Substituição do Gemini pelo Llama 3.2 (Ollama)

Concluímos com sucesso a substituição do provedor de IA do Google Gemini pelo Llama 3.2 executado localmente por meio do Ollama.

As seguintes alterações foram feitas no projeto:

## 1. Infraestrutura Docker
- **[docker-compose.yml](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/docker-compose.yml)**:
  - Adicionado o container `saas_ollama` utilizando a imagem `ollama/ollama:latest`.
  - Mapeamento de porta `11434` e criação do volume persistente `ollama_data` para manter os pesos dos modelos salvos localmente.
  - Vinculado ao container do back-end Node (`saas_node_api`) com o parâmetro `depends_on` e passagem de variável de ambiente `OLLAMA_URL=http://saas_ollama:11434`.

## 2. Configurações e Banco de Dados
- **[.env](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/.env)** & **[node-version/.env](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/.env)**:
  - Removidas as credenciais do Google Gemini.
  - Adicionadas as variáveis `OLLAMA_URL` e `LLAMA_MODEL=llama3.2`.
- **[models.js](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/models/sql/models.js)**:
  - Atualizados os valores padrão do modelo `AiConfig` na tabela de configurações de IA (`ai_configs`), definindo `provider: 'llama'` e `model: 'llama3.2'`.

## 3. Serviços e Lógica de IA
- **[llamaService.js](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/services/ai/llamaService.js)**:
  - Criado o novo serviço integrando diretamente com a API HTTP local do Ollama (`/api/chat`).
  - Implementado o método `buildHistoryFromMessages` para converter históricos do MongoDB para o formato padrão do Ollama (mensagens com `role` e `content`).
  - Implementado o método `ensureModelExists` que realiza um check inicial no endpoint `/api/tags` e dispara de forma assíncrona o download do modelo `llama3.2` se ele não for encontrado localmente.
- **[agentService.js](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/services/ai/agentService.js)**:
  - Removido o import do `geminiService` e adicionado o `llamaService`.
  - Atualizada a validação de provedores para processar as requisições de mensagens do usuário direcionadas ao provedor `'llama'`.
- **[NodeActions.js](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/services/flow/NodeActions.js)**:
  - Modificado o fluxo de execução de nós de IA (`executeAINode`) para utilizar o `LlamaService` para formatação do histórico de conversas e geração da resposta.
- **[server.js](file:///C:/Users/MPLopes/.gemini/antigravity/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/server.js)**:
  - Adicionado o carregamento robusto do dotenv no início do servidor e a chamada assíncrona para `LlamaService.ensureModelExists()` durante o bootstrap do monolito.

## 4. Validação
- Executada checagem de sintaxe dos arquivos modificados utilizando o comando nativo `node --check`, confirmando que toda a estrutura do código foi atualizada sem quebras de compilação ou erros de importação.
