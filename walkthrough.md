# Walkthrough: Integrações e Dockerização do SaaS-Chatbot

Este documento resume as modificações realizadas no backend em Node.js do projeto **SaaS-Chatbot** para implementar o suporte a mídias e chamadas, e a recente reestruturação do Docker Compose para inicializar todo o ecossistema de front-end e servidores web de forma unificada.

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

## 🐳 4. Configuração de Dockerização do Frontend & Docker Compose

Para permitir a inicialização unificada do front-end PHP, do banco local MySQL e do servidor web de segurança Nginx junto com a infraestrutura de backend original, realizamos as seguintes inclusões:

### A. Dockerfile do Frontend ([Dockerfile](file:///D:/SaaS-Chatbot/chatbot/Dockerfile))
Criado no diretório `chatbot/` (tanto no repositório físico quanto na worktree), configurado sob a imagem base `php:8.2-apache`. Ele:
1. Instala a extensão PHP `pdo_mysql` para persistência no banco local.
2. Habilita o módulo `rewrite` do Apache para permitir o roteamento baseado no `.htaccess` (`router.php`).
3. Reconfigura o Apache para escutar na porta `8081` para casar estritamente com as rotas do proxy reverso Nginx.
4. Ajusta a variável `APACHE_DOCUMENT_ROOT` para apontar diretamente para a pasta `/var/www/html/public`, isolando o código-fonte da camada pública.

### B. Módulo MySQL do Frontend ([saas_mysql])
Adicionado ao `docker-compose.yml` para persistência da tabela local de usuários do chatbot (`chatbot_db`). Ele mapeia o arquivo SQL de inicialização original `./chatbot/database/schema.sql` diretamente em `/docker-entrypoint-initdb.d/schema.sql` para que as tabelas necessárias (tabela `users`) sejam criadas de forma automatizada na inicialização primária. A porta externa foi mapeada em `3309:3306` para evitar conflito com instâncias físicas do MySQL rodando no WAMP/XAMPP do host local (porta `3306`).

### C. Mapeamento de Serviços no Docker Compose ([docker-compose.yml](file:///D:/SaaS-Chatbot/docker-compose.yml))
* O serviço original `saas_node_api` foi renomeado no compose para `saas_api`, alinhando-se com a diretiva de resolução de nomes que constava na configuração do proxy do Nginx.
* Adicionado o serviço `saas_ui` (Frontend PHP) com mapeamento das variáveis de ambiente necessárias (banco interno `saas_mysql` e API interna `http://saas_api:8000`), expondo a porta `8081`.
* Adicionado o serviço `saas_nginx` (Proxy reverso Nginx) apontando para o subdiretório `./nginx` onde monta os certificados SSL autoassinados e roteia as rotas `/` para `saas_ui:8081` e `/api/v1/` para `saas_api:8000`.

---

## 🧪 Validação dos Testes

### Testes da API (Backend)
Criamos e executamos um script de validação sintática e de importação em [test_media_and_calls.js](file:///C:/Users/MPLopes/worktrees/SaaS-Chatbot/analyze-saas-chatbot-backend/node-version/scratch/test_media_and_calls.js) para assegurar a integridade do código implementado no backend Node:
```bash
node scratch/test_media_and_calls.js
```
Todos os testes passaram (conexão com Postgres, Mongo, StorageService, carregamento das funções de chamada e checagem de tipos de arquivos).

### Validação do Docker Compose
Executamos o comando de verificação e consolidação do docker-compose para assegurar a conformidade sintática e o mapeamento adequado de todas as dependências, portas e diretórios de contexto:
```bash
docker-compose config
```
O comando validou a estrutura inteira de 9 serviços (`saas_postgres`, `saas_redis`, `saas_rabbitmq`, `saas_mongo`, `saas_api`, `saas_ollama`, `saas_mysql`, `saas_ui`, `saas_nginx`) e 4 volumes montados de forma idônea.
