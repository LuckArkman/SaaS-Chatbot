# Relatório de Análise Técnica e Arquitetura Detalhada do Front-end (SaaS-Chatbot)

Este documento apresenta uma auditoria minuciosa, estrutural e de código de toda a arquitetura do front-end do projeto **SaaS-Chatbot**, localizado no subdiretório `chatbot` (caminho físico: `D:\SaaS-Chatbot\chatbot`). 

---

## 📂 1. Mapeamento da Estrutura de Diretórios e Arquivos

O front-end do `chatbot` está estruturado sob a seguinte árvore de diretórios:

```
D:\SaaS-Chatbot\chatbot\
├── composer.json (PSR-4 Autoload para src/)
├── composer.lock
├── index.php (Entrada/Redirecionador de raiz)
├── .htaccess (Regras de rewrite para public/)
├── database/ (Schemas de banco local)
├── public/
│   ├── index.php (Roteador e ponto de entrada público)
│   ├── router.php
│   ├── .htaccess
│   ├── css/
│   │   ├── dash-media.css (Estilos para mídias no chat e testes)
│   │   └── sidebar-expand.css (Estilos do menu lateral recolhível)
│   └── js/
│       ├── dash-api-call-log.js (Intercepta fetch e cria painel de auditoria)
│       ├── dash-whatsapp-media.js (Detecta, faz upload e renderiza mídias)
│       ├── dash-chat-bind.js (Liga a lógica de mídia às views de conversas via MutationObserver)
│       ├── dash-media-tests.js (Roda as suítes de teste de mídia no browser)
│       └── sidebar-expand.js (Persiste e aplica estado recolhível do menu)
├── src/
│   ├── Bootstrap.php (Inicialização e parsing do .env)
│   ├── Router.php (Roteador MVC simples desenvolvido sob medida)
│   ├── Controller/ (Controladores das views e proxy local JSON)
│   ├── Database/ (Conexão MySQL singleton local via PDO)
│   ├── Model/ (Modelos locais - ex. User)
│   ├── Service/ (Consumo cURL do backend SaaS)
│   └── Support/ (Utilitários de JID, programador e caminhos)
├── views/
│   ├── testes-api.php (Interface operacional de testes de ciclo do bot e websocket)
│   ├── testes-media.php (Interface operacional de execução das suítes de mídia)
│   └── partials/
│       ├── chat-composer-media.php (Seletor visual de anexo)
│       └── dashboard-media-scripts.php (Inclusão centralizada de scripts de mídia)
└── test_*.js (Scripts Node na raiz para validar a integração de mídia no backend)
```

---

## 🛠️ 2. Dependências, Configurações e Inicialização

### Gerenciador de Pacotes e Carregamento Automático
* **Arquivo:** [composer.json](file:///D:/SaaS-Chatbot/chatbot/composer.json)
* **Finalidade:** O projeto não possui dependências PHP externas. O `composer.json` define apenas o requisito mínimo do sistema (`php >= 8.0`) e configura o **PSR-4 Autoloading** associando o namespace raiz `App\` ao diretório `src/`.

### Inicialização e Ambiente
* **Arquivo:** [Bootstrap.php](file:///D:/SaaS-Chatbot/chatbot/src/Bootstrap.php)
* **Finalidade:** Expõe o método estático `loadEnv()`, que inicia a sessão PHP (`session_start()`) caso não tenha sido inicializada e lê linha a linha o arquivo `.env` para carregar as chaves de configuração do banco de dados e da API SaaS para a memória global (`$_ENV`, `$_SERVER` e `putenv()`), ignorando comentários (`#`). O método `env(string $key, string $default)` simplifica a recuperação dessas chaves.

### Mecanismo de Roteamento Local
* **Arquivo:** [Router.php](file:///D:/SaaS-Chatbot/chatbot/src/Router.php)
* **Finalidade:** Provê um sistema simples de roteamento que mapeia métodos HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) para funções anônimas (callbacks) dos controladores correspondentes. O método `dispatch()` recupera a rota atual priorizando o parâmetro `?url=` (repassado pelas regras de rewrite do `.htaccess`) e faz o casamento exato de rotas, devolvendo HTTP 404 caso não haja correspondência.

---

## 🗄️ 3. Camada de Persistência Local (MySQL)

Embora a maior parte dos dados da aplicação operacional (mensagens, conversas, configurações de bot) resida na API SaaS, o front-end possui suporte a um banco MySQL local (`chatbot_db`) para controle de usuários locais e acessos iniciais:

* **Conexão:** [Connection.php](file:///D:/SaaS-Chatbot/chatbot/src/Database/Connection.php)
  Implementa um padrão de inicialização tardia (Singleton) para instanciar a classe `PDO` configurada com codificação de caracteres `utf8mb4` e tratamento automático de erros via exceções (`PDO::ERRMODE_EXCEPTION`).
* **Modelo de Usuário:** [User.php](file:///D:/SaaS-Chatbot/chatbot/src/Model/User.php)
  Gerencia interações simples com a tabela `users`, expondo os métodos `all()` (lista decrescente por data), `find(int $id)` (busca por chave primária) e `create(array $data)` (insere nome e e-mail).

---

## 🌐 4. Cliente cURL Consumidor da API SaaS

Toda a lógica de rede para interagir com o backend Node.js (SaaS API) está centralizada na camada de serviço.

* **Classe:** [OmniChannelApiClient.php](file:///D:/SaaS-Chatbot/chatbot/src/Service/OmniChannelApiClient.php)
* **Propósito:** Encapsular chamadas HTTP cURL para os endpoints prefixados em `/api/v1/` na SaaS API.

### Implementações Notáveis no OmniChannelApiClient

1. **Tratamento Inteligente de Conexões SSE (Server-Sent Events) no QR Code:**
   O endpoint de obtenção de QR Code (`GET /api/v1/bot/qr`) responde com uma conexão de stream SSE persistente que transmite repetidas linhas no formato `data: {"qrcode": "...", ...}`. Para evitar que o script PHP congele (*hang*) aguardando o encerramento do stream pelo servidor, a função `fetchBotQrFromSaaS()` define a propriedade `CURLOPT_WRITEFUNCTION`:
   ```php
   CURLOPT_WRITEFUNCTION => function ($curl, string $data) use (&$accumulated, &$earlyQrPayload): int {
       $accumulated .= $data;
       $parsed = $this->parseBotQrSseOrJson($accumulated);
       if ($parsed !== null && (!empty($parsed['qrcode']) || !empty($parsed['qrcode_base64']))) {
           $earlyQrPayload = $parsed;
           return 0; // Aborta a conexão forçando CURLE_WRITE_ERROR imediatamente
       }
       return \strlen($data);
   }
   ```
   Dessa forma, assim que o primeiro chunk contendo a string de imagem em base64 do QR Code é recebido e decodificado, a transferência cURL é abortada e o QR Code é entregue de forma instantânea para renderização.
   Adicionalmente, se houver timeout da conexão (`CURLE_OPERATION_TIMEDOUT`), o PHP verifica o buffer parcial acumulado. Caso encontre um QR válido, ele o recupera sem falhar a requisição.

2. **Preservação de Objetos Vazios em JSON (Rotas de Flows):**
   Mapeadores tradicionais do PHP convertem objetos JSON vazios `{}` em arrays do PHP `[]`. Ao realizar a serialização de volta (`json_encode`), o PHP enviaria `[]` para a SaaS, disparando erros de validação (HTTP 422) no backend Node (que espera schemas de nós do FlowBuilder).
   Para contornar esse problema, a classe expõe as funções `postRawJson` e `patchRawJson` que recebem e transmitem a string serializada bruta recebida do navegador (`php://input`), ignorando os mapeamentos de array do PHP.

3. **Suporte Completo de Endpoints:**
   Possui mapeamentos específicos para gerenciar todas as chamadas operacionais:
   * **Auth:** Login (com suporte a `x-www-form-urlencoded` exigido no OpenAPI), Registro de inquilino (tenant) com aliases para compatibilidade com snake_case e camelCase, recuperação/troca de senha e `/auth/me`.
   * **Chat:** Histórico de conversas por JID, controle de digitação (`/chat/typing`), transferência de atendimento (`/chat/transfer`) e presença de operador (`/chat/presence`).
   * **Bot:** Controle de ciclo (`botStatus`, `botStart`, `botStop`, `botRestart`, `botLogout`).
   * **Faturamento/Billing:** Listagem de planos, checkout via provedor de pagamentos e simulação de webhook de faturamento.
   * **Contatos & Uploads:** Busca de contatos locais e específicos do WhatsApp, opt-out de envios, upload de mídias (`POST /api/v1/storage/upload` com `CURLFile` para envio multipart) e importação em massa de contatos em arquivos CSV.

---

## 🗄️ 5. Controlador Proxy Local (ApiOmniController)

* **Classe:** [ApiOmniController.php](file:///D:/SaaS-Chatbot/chatbot/src/Controller/ApiOmniController.php)
* **Propósito:** Age como o gateway local do front-end. O navegador nunca fala com o backend Node.js diretamente; ele faz requisições AJAX para o `ApiOmniController` no PHP, que valida a autenticação (`$_SESSION['omni_token']`), anexa o token e o inquilino (`X-Tenant-ID`) apropriados e retransmite para o backend.

### Tratamentos Importantes no ApiOmniController

* **Resiliência a Erros de Estado do Inquilino:**
  Ao receber uma exceção `ApiException` da SaaS (como HTTP 402 - Pagamento Requerido para utilizar instâncias de bot ou 404 - QR Code indisponível), o proxy não falha com erro 500 do servidor. Em vez disso, ele converte o erro de negócio em um payload amigável com um campo customizado (`utalk_hint_pt`), indicando em português claro para o operador se o problema está na falta de assinatura ou se o serviço de bot precisa ser iniciado.
* **Envio de Mídias Intermediado:**
  A rota `chatSend()` exposta pelo proxy intercepta as chamadas do navegador, faz a decodificação preliminar e converte o envelope JSON-RPC (Websocket) ou inputs clássicos em payloads estruturados, normalizando propriedades como `mediaUrl` / `media_url` e aplicando normalização de JIDs.
* **Configuração de WebSocket sob Medida:**
  A rota `authWsConfig()` resolve a URL WebSocket interna da SaaS, gerando o link estruturado `ws://<host>:<port>/api/v1/ws?token=<JWT>` para que o Javascript do navegador consiga estabelecer a conexão push direta.

---

## 📎 6. Scripts Auxiliares e Arquivos de Suporte

Localizados na pasta `src/Support/`:

* **[ConversationId.php](file:///D:/SaaS-Chatbot/chatbot/src/Support/ConversationId.php):**
  Lógica extremamente robusta e centralizada para lidar com IDs de conversa. O WhatsApp utiliza o formato JID (ex.: `5511999999999@s.whatsapp.net`). O script resolve números puros de telefone para JIDs, extrai chaves aninhadas dos contatos presentes em envelopes de WebSocket JSON-RPC (`receive_message`) e garante que as requisições de mensagens ou histórico utilizem a thread correta de conversa em vez de identificadores internos do banco de dados.
* **[ProgramadorAccess.php](file:///D:/SaaS-Chatbot/chatbot/src/Support/ProgramadorAccess.php):**
  Gerencia níveis de acesso diferenciados baseados nos e-mails de sessão. Se o e-mail estiver configurado na lista do `.env` sob `PROGRAMADOR_EMAILS`, o usuário é restrito a rotas e consoles de depuração de API (como `/programador/api`, `/testes-api`, `/testes-media`). Caso esteja sob `PROGRAMADOR_FULL_ACCESS_EMAILS`, o usuário tem acesso simultâneo à depuração e ao painel visual de conversas operacionais.
* **[PublicBasePath.php](file:///D:/SaaS-Chatbot/chatbot/src/Support/PublicBasePath.php):**
  Auxiliar que normaliza o subdiretório público de implantação da aplicação baseado em variáveis como `SCRIPT_NAME` e `REQUEST_URI` para evitar erros de caminhos de arquivos css/js quando o projeto é implantado em pastas não raiz do servidor.
* **[SaaSEndpointHints.php](file:///D:/SaaS-Chatbot/chatbot/src/Support/SaaSEndpointHints.php):**
  Gera dinamicamente dicas visuais de URLs e exemplos de linha de comando Python baseados na URI ativa para exibição nos consoles do programador.

---

## 🖥️ 7. Camada Cliente do Navegador (Vanilla JS/CSS)

A interface no lado do cliente é montada com scripts JavaScript puros e folhas de estilo CSS customizadas sem dependências de compilação ou empacotamento (webpack/vite/npm):

### 💾 1. Painel Flutuante de Logs da API
* **Script:** [dash-api-call-log.js](file:///D:/SaaS-Chatbot/chatbot/public/js/dash-api-call-log.js)
* **Como Funciona:** Monkeypatches (sobrescreve) a função padrão do navegador `window.fetch`. Sempre que uma requisição AJAX para `/api/omni/*` é executada, ele captura o timestamp, o payload enviado (incluindo tratamento de uploads de `FormData`), o status HTTP da resposta, o tempo total de round-trip em milissegundos e o payload retornado.
* **Interface Visual:** Salva as últimas 150 chamadas na aba atual usando o `sessionStorage`. Injeta dinamicamente estilos CSS e um Drawer deslizante lateral acionável por um botão fixo no canto inferior direito (**API**), onde o desenvolvedor ou operador pode inspecionar detalhadamente todo o tráfego HTTP sem abrir as ferramentas de desenvolvedor do navegador.

### 📎 2. Gerenciador de Uploads e Envio de Anexos
* **Script:** [dash-whatsapp-media.js](file:///D:/SaaS-Chatbot/chatbot/public/js/dash-whatsapp-media.js)
* **Como Funciona:** 
  * Possui mapas de extensão para identificação de MIME types básicos (`.jpg`, `.pdf`, `.mp4`, `.ogg`).
  * Expõe a função assíncrona `sendFile()` que gerencia o upload de arquivos via Multipart (`/storage/upload`) e, em seguida, dispara o payload de mensagem (`/chat/send`) contendo o link do arquivo retornado pelo storage e seu tipo correspondente (`image`, `video`, `audio` ou `document`).
  * A função `renderMessageInner()` renderiza o elemento HTML correto no chat baseando-se no tipo da mídia (tags `<img>`, `<video controls>`, `<audio controls>` ou hiperlinks textuais com emoji de clipe para documentos).

### 🔄 3. Integração Dinâmica da Tela de Conversas
* **Script:** [dash-chat-bind.js](file:///D:/SaaS-Chatbot/chatbot/public/js/dash-chat-bind.js)
* **Como Funciona:**
  * Sobrescreve a rotina global de renderização de bolhas de mensagens (`UTALK_RENDER_MESSAGE`). Se a mensagem a ser renderizada for de mídia, ele interrompe o fluxo normal de texto e injeta a marcação visual gerada pelo `dash-whatsapp-media.js`.
  * Cria um **MutationObserver** focado na listagem de mensagens (`#chatMessages` ou `[data-utalk-chat-messages]`). Sempre que o WebSocket insere uma nova bolha na árvore DOM do navegador, o script intercepta a inclusão e reformata o conteúdo do JSON recebido para exibir a imagem/áudio/vídeo em tempo real.
  * Realiza o acoplamento do input de arquivo (`#utalkChatFile`) e do botão de anexo (`#utalkChatAttach`) ao painel de digitação ativa.

### 🧪 4. Suíte de Validação no Navegador
* **Script:** [dash-media-tests.js](file:///D:/SaaS-Chatbot/chatbot/public/js/dash-media-tests.js)
* **Como Funciona:** Provê a lógica para a interface interativa `/testes-media`. Ao clicar nas ações correspondentes, executa sequencialmente requisições reais de uploads falsos e envios de mensagens simulados para atestar a conformidade e integridade dos endpoints da API, imprimindo os resultados em um console formatado.

### 🗂️ 5. Menu Lateral
* **Script:** [sidebar-expand.js](file:///D:/SaaS-Chatbot/chatbot/public/js/sidebar-expand.js) & [sidebar-expand.css](file:///D:/SaaS-Chatbot/chatbot/public/css/sidebar-expand.css)
* **Como Funciona:** Permite que o menu lateral seja recolhido/expandido, aplicando dinamicamente a classe `sidebar--expanded` e persistindo a preferência do operador no `localStorage` sob a chave `utalk_sidebar_expanded`.

---

## 🚦 8. Scripts de Teste de Integração (Raiz de `chatbot`)

Na raiz do diretório do front-end existem 3 scripts executados sob ambiente Node.js. Embora residam na pasta `chatbot`, eles servem como testes pontuais contra os modelos e serviços do backend Node.js:

1. **[test_media_and_calls.js](file:///D:/SaaS-Chatbot/chatbot/test_media_and_calls.js):** Validação sintática e de imports. Certifica que os modelos do Postgres (`CallLog`, `WhatsAppInstance`), do MongoDB (`Message`) e o `StorageService` são carregados corretamente.
2. **[test_full_whatsapp_media.js](file:///D:/SaaS-Chatbot/chatbot/test_full_whatsapp_media.js):** Simulação de ponta a ponta. Cria mocks para instâncias Baileys, conexões WebSocket e banco de dados MongoDB para simular o armazenamento local de arquivos segmentados sob a pasta do inquilino (`uploads/<tenant_id>/`) e o broadcast via WebSocket de novas mensagens recebidas.
3. **[test_api_whatsapp_media.js](file:///D:/SaaS-Chatbot/chatbot/test_api_whatsapp_media.js):** Validação real de rotas HTTP. Utiliza o Axios e FormData para rodar uploads físicos de mídias fictícias contra `/storage/upload`, `/chat/send` e `/gateway/webhook/whatsapp`.

---

## 💡 9. Resumo das Descobertas Técnicas e Arquitetura

1. **Arquitetura Híbrida e Fina:** O front-end atua essencialmente como um cliente fino e leve. A renderização inicial das páginas e a autenticação usam PHP com dados da sessão (`$_SESSION`), enquanto a reatividade das mensagens no chat utiliza WebSocket direto ao backend e injeções reativas baseadas em `MutationObserver` no DOM do navegador.
2. **Abstração e Segurança contra CORS/Headers:** Toda a transmissão de dados é interceptada pelo proxy local PHP. Isso elimina qualquer preocupação com CORS (Cross-Origin Resource Sharing) no navegador e oculta de forma segura chaves e tokens de API confidenciais do backend Node, trafegando-os apenas no canal seguro do servidor.
3. **SSE sob Controle:** O uso de cURL em conexões de QR Code persistentes (que de outra forma travariam o fluxo do servidor) é brilhantemente contornado no `OmniChannelApiClient` com o manipulador de buffer que aborta a requisição assim que o payload base64 útil é recebido.
4. **Isolamento e Compatibilidade de Formatos:** O proxy realiza validações para garantir a conformidade dos dados recebidos do front-end e enviados ao backend (por exemplo, mantendo o formato bruto de JSON nos fluxos do FlowBuilder e convertendo formatos de telefones em JIDs válidos do WhatsApp).
