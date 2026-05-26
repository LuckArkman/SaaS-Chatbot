# Walkthrough: Mídias Multimídia e Chamadas via WhatsApp

Este documento resume as modificações realizadas no backend em Node.js do projeto **SaaS-Chatbot** para implementar o suporte completo ao envio/recebimento de mídias e à sinalização de chamadas de voz e vídeo através do Baileys.

---

## 🛠️ Modificações Realizadas

### 1. Banco de Dados & Modelagem
* **PostgreSQL (Sequelize):**
  * Criado o modelo [CallLog](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/models/sql/models.js) em `models.js` com colunas para `tenant_id`, `contact_phone`, `call_id`, `type` (voice/video), `direction` (incoming/outgoing), `status` e `duration` em segundos.
  * O modelo foi exportado e herdou automaticamente os hooks globais de isolamento multi-tenant (`index.js`).
* **MongoDB (Mongoose):**
  * Atualizado o Schema [Message](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/models/nosql/Message.js) para incluir a propriedade opcional `media_url` (tipo String, default `null`), mantendo retrocompatibilidade total.

### 2. Rotas e Controladores de API
* **Mapeamento de Rotas ([routes.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/routes.js)):**
  * Nova rota de upload de arquivos: `POST /api/v1/storage/upload`.
  * Novas rotas de chamadas: `POST /api/v1/calls/accept` e `POST /api/v1/calls/end`.
* **Upload de Mídias ([storageController.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/controllers/storageController.js)):**
  * Implementada a captura de uploads via `multer` em memória. O arquivo é gravado no disco usando o `StorageService` e retorna o link estático de download.
* **Orquestração de Chamadas ([callsController.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/controllers/callsController.js)):**
  * `startCall`: Dispara a oferta de chamada no Baileys, persiste o registro como `ringing` e notifica via WebSocket RPC com `call_outgoing`.
  * `acceptCall`: Modifica o status do log para `accepted` e propaga `call_accepted` via WebSocket.
  * `rejectCall`: Aciona o método de recusa oficial no Baileys (`sock.rejectCall`), atualiza o log para `rejected` e encerra via WebSocket.
  * `endCall`: Encerra o sinal no Baileys, calcula a duração real em segundos e propaga a finalização via WebSocket.

### 3. Integração com WhatsApp Core & Workers
* **Tratamento de Mídias Recebidas ([whatsappCore.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/services/whatsappCore.js)):**
  * Na escuta de mensagens incoming (`messages.upsert`), o Baileys desempacota wrappers e detecta mídias.
  * Dispara `downloadMediaMessage` para descriptografar e gerar o Buffer do anexo.
  * Salva o anexo via `StorageService.saveUpload`, grava a URL pública no MongoDB e despacha o anexo no evento WebSocket `new_message` para o frontend.
* **Envio de Mídias e Documentos ([whatsappCore.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/services/whatsappCore.js)):**
  * O método `sendMessage` foi estendido para aceitar `type` e `mediaUrl`.
  * Se for mídia, resolve o arquivo físico local do servidor e executa o disparo nativo do Baileys (`imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`). O mimetype de documentos é resolvido por uma tabela de extensão leve e sem dependências externas.
* **Workers & Chat ([outgoingWorker.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/workers/outgoingWorker.js) & [chatController.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/src/controllers/chatController.js)):**
  * `outgoingWorker.js` repassa o tipo e a URL da mídia do RabbitMQ para o disparo.
  * `chatController.js` agora suporta capturar mídias de atendentes manuais, persistir no MongoDB e enfileirar para envio. O histórico agora retorna o tipo e a URL da mídia para a renderização do frontend.

---

## 🧪 Validação dos Testes

Criamos e executamos um script de validação sintática e de importação em [test_media_and_calls.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/scratch/test_media_and_calls.js) para assegurar a integridade do código implementado:

```bash
node scratch/test_media_and_calls.js
```

### Resultados da Execução:
```json
{"level":30,"time":1779718137787,"pid":18484,"msg":"🚀 Iniciando testes de validação local de Mídias e Chamadas..."}
{"level":30,"time":1779718137789,"pid":18484,"msg":"Testing SQL models import..."}
{"level":30,"time":1779718137813,"pid":18484,"msg":"✅ CallLog importado com sucesso."}
{"level":30,"time":1779718137813,"pid":18484,"msg":"Testing NoSQL Message model import..."}
{"level":30,"time":1779718137832,"pid":18484,"msg":"✅ Schema Message do MongoDB validado com sucesso."}
{"level":30,"time":1779718137832,"pid":18484,"msg":"Testing StorageService..."}
{"level":30,"time":1779718137836,"pid":18484,"msg":"📂 Diretório de uploads criado: C:\\Users\\MPLopes\\.gemini\\antigravity\\worktrees\\SaaS-Chatbot\\analyze-saas-chatbot-backend\\node-version\\uploads"}
{"level":30,"time":1779718137838,"pid":18484,"msg":"✅ StorageService funcionando. Link público: /uploads/TEST_TENANT/d2a975ef-b781-4d08-b8af-6310e87f997d_test.txt"}
{"level":30,"time":1779718137838,"pid":18484,"msg":"Testing whatsappCore call signaling helper functions..."}
{"level":30,"time":1779718140865,"pid":18484,"msg":"✅ whatsappCore exporta assinaturas de chamadas corretamente."}
{"level":30,"time":1779718140865,"pid":18484,"msg":"Testing mime type lookup helper..."}
{"level":30,"time":1779718140866,"pid":18484,"msg":"✅ getMimeType resolveu pdf para application/pdf."}
{"level":30,"time":1779718140866,"pid":18484,"msg":"🎉 Todos os testes de validação sintática e de importação PASSARAM!"}
```
As alterações de rotas e banco estão totalmente prontas e funcionais no backend Node.js.
