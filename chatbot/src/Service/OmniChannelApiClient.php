<?php

declare(strict_types=1);

namespace App\Service;

use App\Bootstrap;

/**
 * Cliente para a API OmniChannel (prefixo /api/v1/).
 * Todas as requisições autenticadas usam JWT no header Authorization.
 */
class OmniChannelApiClient
{
    private string $baseUrl;
    private int $timeout;
    private ?string $token;

    /** Último pedido GET /bot/qr montado para a SaaS (diagnóstico no proxy). */
    private ?array $lastBotQrOutboundDebug = null;

    public function __construct(?string $token = null)
    {
        $this->baseUrl = rtrim(
            Bootstrap::env('API_BASE_URL', 'http://76.13.168.200:8001'),
            '/'
        );
        $this->timeout = (int) Bootstrap::env('API_TIMEOUT', '30');
        $this->token = $token ?? ($_SESSION['omni_token'] ?? null);
    }

    /** Base URL da API SaaS (API_BASE_URL no .env), para diagnóstico no proxy. */
    public function getConfiguredBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /** O que foi (ou seria) enviado ao GET /api/v1/bot/qr na SaaS — preenchido em botQr(). */
    public function getLastBotQrOutboundDebug(): ?array
    {
        return $this->lastBotQrOutboundDebug;
    }

    private static function maskBearerForLog(?string $token): string
    {
        if ($token === null || $token === '') {
            return 'Bearer <ausente — faça login e use access_token do /auth/login>';
        }
        $len = strlen($token);
        if ($len <= 14) {
            return 'Bearer <token muito curto ou inválido>';
        }

        return 'Bearer ' . substr($token, 0, 8) . '…' . substr($token, -4) . ' (comprimento ' . $len . ' — substitua por COLAR_SEU_ACCESS_TOKEN_AQUI nos exemplos abaixo)';
    }

    /**
     * @param array|null $body Corpo JSON (null com $omitRequestBody = POST sem json/data, como httpx)
     * @param bool       $formUrlEncoded application/x-www-form-urlencoded (ex.: login com data= do Python)
     * @param bool       $omitRequestBody Se true, não envia CURLOPT_POSTFIELDS; headers iguais ao Python (Content-Type: application/json + Bearer)
     * @param int|null   $timeoutOverride Segundos (ex.: 30 como no script Python); null usa API_TIMEOUT
     * @param array      $queryParams     Query string (ex.: POST /chat/typing na SaaS usa ?conversation_id=&is_typing=)
     */
    public function request(string $method, string $path, ?array $body = null, bool $formUrlEncoded = false, bool $omitRequestBody = false, ?int $timeoutOverride = null, array $queryParams = []): array
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');
        if ($queryParams !== []) {
            $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($queryParams);
        }
        $ch = curl_init($url);

        // Mesmo padrão do Python: headers = { Authorization, Content-Type: application/json } em todas as rotas JSON
        $headers = ['Accept: application/json'];
        if ($formUrlEncoded) {
            array_unshift($headers, 'Content-Type: application/x-www-form-urlencoded');
        } else {
            array_unshift($headers, 'Content-Type: application/json');
        }
        if ($this->token !== null && $this->token !== '') {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }
        $tenantId = $_SESSION['omni_tenant_id'] ?? null;
        if ($tenantId !== null && $tenantId !== '') {
            $headers[] = 'X-Tenant-ID: ' . $tenantId;
        }

        $timeout = $timeoutOverride ?? $this->timeout;
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
        ];

        if (!$omitRequestBody && $body !== null && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
            $opts[CURLOPT_POSTFIELDS] = $formUrlEncoded ? http_build_query($body) : json_encode($body);
        }

        curl_setopt_array($ch, $opts);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \RuntimeException("Erro ao conectar na API: $error");
        }

        $responseRaw = $response !== false ? (string) $response : '';
        $data = $responseRaw !== '' ? json_decode($responseRaw, true) : null;
        if ($responseRaw !== '' && json_last_error() !== JSON_ERROR_NONE) {
            $data = ['_raw' => $responseRaw];
        }

        if ($httpCode >= 400) {
            $msg = "API retornou HTTP $httpCode";
            if (is_array($data)) {
                if (isset($data['detail'])) {
                    $d = $data['detail'];
                    $msg = is_string($d) ? $d : (is_array($d) ? json_encode($d, JSON_UNESCAPED_UNICODE) : $msg);
                } elseif (isset($data['message']) && is_string($data['message'])) {
                    $msg = $data['message'];
                } elseif (isset($data['error']) && is_string($data['error'])) {
                    $msg = $data['error'];
                } elseif (isset($data['errors']) && is_array($data['errors'])) {
                    $msg = implode(' ', array_map(fn($e) => is_string($e) ? $e : json_encode($e), $data['errors']));
                }
            }
            throw new ApiException(
                $msg,
                $httpCode,
                $data ?? [],
                $url,
                $method,
                $omitRequestBody ? null : $body,
                $responseRaw,
                $omitRequestBody
            );
        }

        return is_array($data) ? $data : [];
    }

    /**
     * POST/PATCH com corpo JSON já serializado — preserva objetos vazios `{}` do cliente.
     * (json_decode(..., true) em PHP transforma `{}` em [] e json_encode volta a mandar [] para a SaaS.)
     *
     * @throws ApiException
     */
    private function requestWithRawJsonBody(string $method, string $path, string $jsonBody): array
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');
        $ch = curl_init($url);
        $headers = ['Content-Type: application/json', 'Accept: application/json'];
        if ($this->token !== null && $this->token !== '') {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }
        $tenantId = $_SESSION['omni_tenant_id'] ?? null;
        if ($tenantId !== null && $tenantId !== '') {
            $headers[] = 'X-Tenant-ID: ' . $tenantId;
        }
        $timeout = $this->timeout;
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $jsonBody,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($error) {
            throw new \RuntimeException("Erro ao conectar na API: $error");
        }
        $responseRaw = $response !== false ? (string) $response : '';
        $decodedForException = json_decode($jsonBody, true);
        $bodyForException = is_array($decodedForException) ? $decodedForException : null;
        $data = $responseRaw !== '' ? json_decode($responseRaw, true) : null;
        if ($responseRaw !== '' && json_last_error() !== JSON_ERROR_NONE) {
            $data = ['_raw' => $responseRaw];
        }
        if ($httpCode >= 400) {
            $msg = "API retornou HTTP $httpCode";
            if (is_array($data)) {
                if (isset($data['detail'])) {
                    $d = $data['detail'];
                    $msg = is_string($d) ? $d : (is_array($d) ? json_encode($d, JSON_UNESCAPED_UNICODE) : $msg);
                } elseif (isset($data['message']) && is_string($data['message'])) {
                    $msg = $data['message'];
                } elseif (isset($data['error']) && is_string($data['error'])) {
                    $msg = $data['error'];
                } elseif (isset($data['errors']) && is_array($data['errors'])) {
                    $msg = implode(' ', array_map(fn ($e) => is_string($e) ? $e : json_encode($e), $data['errors']));
                }
            }
            throw new ApiException($msg, $httpCode, $data ?? [], $url, $method, $bodyForException, $responseRaw, false);
        }

        return is_array($data) ? $data : [];
    }

    public function postRawJson(string $path, string $jsonBody): array
    {
        return $this->requestWithRawJsonBody('POST', $path, $jsonBody);
    }

    public function patchRawJson(string $path, string $jsonBody): array
    {
        return $this->requestWithRawJsonBody('PATCH', $path, $jsonBody);
    }

    public function get(string $path): array
    {
        return $this->request('GET', $path);
    }

    public function post(string $path, array $body = [], bool $formUrlEncoded = false): array
    {
        return $this->request('POST', $path, $body, $formUrlEncoded);
    }

    /**
     * POST sem corpo (sem json=/data= no Python), com os mesmos headers: Content-Type: application/json + Bearer.
     * Timeout alargado (30s) como no script: httpx.post(..., timeout=30.0).
     */
    public function postNoBody(string $path): array
    {
        $botTimeout = (int) Bootstrap::env('API_BOT_TIMEOUT', '30');

        return $this->request('POST', $path, null, false, true, $botTimeout);
    }

    public function put(string $path, array $body = []): array
    {
        return $this->request('PUT', $path, $body);
    }

    public function patch(string $path, array $body = []): array
    {
        return $this->request('PATCH', $path, $body);
    }

    public function delete(string $path): array
    {
        return $this->request('DELETE', $path);
    }

    /**
     * POST multipart/form-data (ex.: import de ficheiro em /contacts/import).
     *
     * @param array<string, \CURLFile|string> $postFields
     */
    private function postMultipart(string $path, array $postFields): array
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');
        $ch = curl_init($url);
        $headers = ['Accept: application/json'];
        if ($this->token !== null && $this->token !== '') {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }
        $tenantId = $_SESSION['omni_tenant_id'] ?? null;
        if ($tenantId !== null && $tenantId !== '') {
            $headers[] = 'X-Tenant-ID: ' . $tenantId;
        }
        $timeout = $this->timeout;
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($error) {
            throw new \RuntimeException("Erro ao conectar na API: $error");
        }
        $responseRaw = $response !== false ? (string) $response : '';
        $data = $responseRaw !== '' ? json_decode($responseRaw, true) : null;
        if ($responseRaw !== '' && json_last_error() !== JSON_ERROR_NONE) {
            $data = ['_raw' => $responseRaw];
        }
        if ($httpCode >= 400) {
            $msg = "API retornou HTTP $httpCode";
            if (is_array($data)) {
                if (isset($data['detail'])) {
                    $d = $data['detail'];
                    $msg = is_string($d) ? $d : (is_array($d) ? json_encode($d, JSON_UNESCAPED_UNICODE) : $msg);
                } elseif (isset($data['message']) && is_string($data['message'])) {
                    $msg = $data['message'];
                } elseif (isset($data['error']) && is_string($data['error'])) {
                    $msg = $data['error'];
                }
            }
            throw new ApiException($msg, $httpCode, is_array($data) ? $data : [], $url, 'POST', null, $responseRaw, false);
        }

        return is_array($data) ? $data : [];
    }

    /**
     * Obtém o documento OpenAPI 3.x da API SaaS (OAS publicado em /api/v1/openapi.json).
     */
    public function fetchOpenApiSpec(): array
    {
        $url = $this->baseUrl . '/api/v1/openapi.json';
        $ch = curl_init($url);
        $headers = ['Accept: application/json'];
        if ($this->token !== null && $this->token !== '') {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }
        $timeout = (int) Bootstrap::env('API_TIMEOUT', '30');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => $headers,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($err !== '') {
            return ['_fetch_error' => $err, '_http' => 0];
        }
        $raw = $response !== false ? (string) $response : '';
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return ['_fetch_error' => 'Resposta não é JSON', '_http' => $httpCode, '_raw_preview' => substr($raw, 0, 500)];
        }
        $data['_http'] = $httpCode;

        return $data;
    }

    /**
     * Encaminha um pedido arbitrário (apenas /api/v1/...) — uso restrito à consola programador.
     *
     * @param array|null $body Corpo JSON; em POST com $noBody=true não envia corpo (como httpx sem json/data)
     */
    public function devForwardRequest(string $method, string $path, ?array $body = null, bool $noBody = false, bool $formUrlEncoded = false): array
    {
        $method = strtoupper(trim($method));
        $path = '/' . ltrim($path, '/');
        if (!str_starts_with($path, '/api/v1/')) {
            throw new \InvalidArgumentException('Apenas caminhos que começam por /api/v1/ são permitidos.');
        }
        if (str_contains($path, '..')) {
            throw new \InvalidArgumentException('Path inválido.');
        }

        return match ($method) {
            'GET' => $this->request('GET', $path),
            'DELETE' => $this->request('DELETE', $path),
            'PATCH' => $this->request('PATCH', $path, $body ?? []),
            'PUT' => $this->request('PUT', $path, $body ?? []),
            'POST' => $noBody
                ? $this->request(
                    'POST',
                    $path,
                    null,
                    false,
                    true,
                    str_contains($path, '/bot/')
                        ? (int) Bootstrap::env('API_BOT_TIMEOUT', '30')
                        : null
                )
                : $this->request('POST', $path, $body ?? [], $formUrlEncoded),
            default => throw new \InvalidArgumentException('Método não suportado: ' . $method),
        };
    }

    // --- Auth ---

    /** Login: API espera application/x-www-form-urlencoded com username e password. */
    public function authLogin(string $username, string $password): array
    {
        return $this->post('/api/v1/auth/login', [
            'username' => $username,
            'password' => $password,
        ], true);
    }

    public function authRegister(string $email, string $password, string $fullName, string $tenantName): array
    {
        // camelCase (ex.: teste Baileys) + snake_case (outras builds FastAPI)
        return $this->post('/api/v1/auth/register', [
            'email' => $email,
            'password' => $password,
            'fullName' => $fullName,
            'tenantName' => $tenantName,
            'full_name' => $fullName,
            'tenant_name' => $tenantName,
        ]);
    }

    public function authPasswordRecovery(string $email): array
    {
        return $this->post('/api/v1/auth/password-recovery/' . rawurlencode($email), []);
    }

    public function authResetPassword(array $payload): array
    {
        return $this->post('/api/v1/auth/reset-password/', $payload);
    }

    public function authChangePassword(array $payload): array
    {
        return $this->post('/api/v1/auth/change-password', $payload);
    }

    public function authMe(): array
    {
        return $this->get('/api/v1/auth/me');
    }

    // --- Gateway ---

    public function gatewayWebhook(string $channelType, array $payload): array
    {
        return $this->post('/api/v1/gateway/webhook/' . rawurlencode($channelType), $payload);
    }

    // --- Flows ---

    public function listFlows(): array
    {
        return $this->get('/api/v1/flows/');
    }

    public function createFlow(array $payload): array
    {
        return $this->post('/api/v1/flows/', $payload);
    }

    /** Cria fluxo reencaminhando o JSON bruto do cliente (preserva `data: {}` nos nodes). */
    public function createFlowFromRawJson(string $jsonBody): array
    {
        return $this->postRawJson('/api/v1/flows/', $jsonBody);
    }

    public function getFlow(string $flowId): array
    {
        return $this->get('/api/v1/flows/' . rawurlencode($flowId));
    }

    public function updateFlow(string $flowId, array $payload): array
    {
        return $this->patch('/api/v1/flows/' . rawurlencode($flowId), $payload);
    }

    public function updateFlowFromRawJson(string $flowId, string $jsonBody): array
    {
        return $this->patchRawJson('/api/v1/flows/' . rawurlencode($flowId), $jsonBody);
    }

    public function deleteFlow(string $flowId): array
    {
        return $this->delete('/api/v1/flows/' . rawurlencode($flowId));
    }

    // --- Chat ---

    public function chatSend(array $payload): array
    {
        return $this->post('/api/v1/chat/send', $payload);
    }

    /**
     * POST /api/v1/chat/typing — OpenAPI: query obrigatório conversation_id + is_typing (sem body JSON).
     */
    public function chatTyping(string $conversationId, bool $isTyping): array
    {
        return $this->request(
            'POST',
            '/api/v1/chat/typing',
            null,
            false,
            true,
            null,
            [
                'conversation_id' => $conversationId,
                'is_typing' => $isTyping ? 'true' : 'false',
            ]
        );
    }

    public function chatHistory(string $conversationId): array
    {
        return $this->get('/api/v1/chat/history/' . rawurlencode($conversationId));
    }

    /**
     * POST /api/v1/chat/transfer/{conversation_id} — OpenAPI: query obrigatório target_agent_id (integer), sem body.
     */
    public function chatTransfer(string $conversationId, int $targetAgentId): array
    {
        return $this->request(
            'POST',
            '/api/v1/chat/transfer/' . rawurlencode($conversationId),
            null,
            false,
            true,
            null,
            ['target_agent_id' => $targetAgentId]
        );
    }

    public function chatPresence(string $userId): array
    {
        return $this->get('/api/v1/chat/presence/' . rawurlencode($userId));
    }

    // --- Bot ---

    public function botStatus(): array
    {
        return $this->get('/api/v1/bot/');
    }

    /**
     * GET /api/v1/bot/qr — a SaaS pode responder JSON único ou SSE (linhas `data: {...}` com qrcode/status).
     * O cliente HTTP genérico faz json_decode do corpo inteiro e falha com SSE; este método trata os dois formatos.
     */
    public function botQr(): array
    {
        return $this->fetchBotQrFromSaaS();
    }

    /**
     * @return array|null último objeto JSON útil; prioriza o último evento com qrcode preenchido
     */
    private function parseBotQrSseOrJson(string $raw): ?array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        if (str_contains($raw, 'data:') && (str_starts_with($raw, 'data:') || str_contains($raw, "\ndata:"))) {
            $lastAny = null;
            $lastWithQr = null;
            foreach (preg_split('/\r\n|\n|\r/', $raw) as $line) {
                $line = trim($line);
                if (!str_starts_with($line, 'data:')) {
                    continue;
                }
                $payload = trim(substr($line, 5));
                if ($payload === '' || strcasecmp($payload, '[DONE]') === 0) {
                    continue;
                }
                $j = json_decode($payload, true);
                if (!is_array($j)) {
                    continue;
                }
                $lastAny = $j;
                if (!empty($j['qrcode']) || !empty($j['qrcode_base64'])) {
                    $lastWithQr = $j;
                }
            }

            return $lastWithQr ?? $lastAny;
        }

        $j = json_decode($raw, true);

        return is_array($j) ? $j : null;
    }

    private function fetchBotQrFromSaaS(): array
    {
        $this->lastBotQrOutboundDebug = null;

        $path = '/api/v1/bot/qr';
        $url = $this->baseUrl . $path;
        $ch = curl_init($url);
        $headers = [
            'Accept: text/event-stream, application/json',
            'Content-Type: application/json',
        ];
        if ($this->token !== null && $this->token !== '') {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }
        $tenantId = $_SESSION['omni_tenant_id'] ?? null;
        if ($tenantId !== null && $tenantId !== '') {
            $headers[] = 'X-Tenant-ID: ' . $tenantId;
        }
        $timeout = (int) Bootstrap::env('API_BOT_QR_TIMEOUT', '90');
        $connectTimeout = 10;

        $headersSentDisplay = [
            'Accept' => 'text/event-stream, application/json',
            'Content-Type' => 'application/json',
            'Authorization' => self::maskBearerForLog($this->token),
        ];
        if ($tenantId !== null && $tenantId !== '') {
            $headersSentDisplay['X-Tenant-ID'] = (string) $tenantId;
        }

        $curlLineRedacted = 'curl -v -G ' . escapeshellarg($url)
            . ' -H ' . escapeshellarg('Accept: text/event-stream, application/json')
            . ' -H ' . escapeshellarg('Content-Type: application/json')
            . ' -H ' . escapeshellarg('Authorization: Bearer COLAR_SEU_ACCESS_TOKEN_AQUI')
            . ($tenantId !== null && $tenantId !== '' ? ' -H ' . escapeshellarg('X-Tenant-ID: ' . $tenantId) : '')
            . ' --max-time ' . $timeout
            . ' --connect-timeout ' . $connectTimeout;

        $curlLineWithToken = $curlLineRedacted;
        if ($this->token !== null && $this->token !== '') {
            $curlLineWithToken = 'curl -v -G ' . escapeshellarg($url)
                . ' -H ' . escapeshellarg('Accept: text/event-stream, application/json')
                . ' -H ' . escapeshellarg('Content-Type: application/json')
                . ' -H ' . escapeshellarg('Authorization: Bearer ' . $this->token)
                . ($tenantId !== null && $tenantId !== '' ? ' -H ' . escapeshellarg('X-Tenant-ID: ' . $tenantId) : '')
                . ' --max-time ' . $timeout
                . ' --connect-timeout ' . $connectTimeout;
        }

        $pyTenant = '';
        if ($tenantId !== null && $tenantId !== '') {
            $pyTenant = "\n    \"X-Tenant-ID\": " . json_encode((string) $tenantId, JSON_UNESCAPED_UNICODE) . ',';
        }
        $httpxRedacted = <<<PY
import httpx

URL = "{$url}"
headers = {
    "Accept": "text/event-stream, application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer COLAR_SEU_ACCESS_TOKEN_AQUI",{$pyTenant}
}
# Obter token: POST {$this->baseUrl}/api/v1/auth/login (form: username, password) → access_token
# Swagger UI: {$this->baseUrl}/docs
with httpx.Client(timeout={$timeout}.0) as client:
    with client.stream("GET", URL, headers=headers) as r:
        print("status", r.status_code, r.headers.get("content-type"))
        for line in r.iter_lines():
            if line:
                print(line[:200])
PY;

        $httpxWithToken = $httpxRedacted;
        if ($this->token !== null && $this->token !== '') {
            $tokenPyLiteral = json_encode($this->token, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $httpxWithToken = <<<PY
import httpx

# TOKEN = access_token da sessão atual (mesmo valor que POST /api/v1/auth/login → r.json()["access_token"])
# Swagger: {$this->baseUrl}/docs
URL = "{$url}"
TOKEN = {$tokenPyLiteral}

headers = {
    "Accept": "text/event-stream, application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer " + TOKEN,{$pyTenant}
}
with httpx.Client(timeout={$timeout}.0) as client:
    with client.stream("GET", URL, headers=headers) as r:
        print("status", r.status_code, r.headers.get("content-type"))
        for line in r.iter_lines():
            if line:
                print(line[:200])
PY;
        }

        $loginUrl = $this->baseUrl . '/api/v1/auth/login';
        $docsUrl = $this->baseUrl . '/docs';

        $this->lastBotQrOutboundDebug = [
            'method' => 'GET',
            'url' => $url,
            'path' => $path,
            'api_base_url_env' => $this->baseUrl,
            'swagger_ui' => $docsUrl,
            'headers_sent' => $headersSentDisplay,
            'body' => null,
            'php_curl_options' => [
                'CURLOPT_TIMEOUT' => $timeout,
                'CURLOPT_CONNECTTIMEOUT' => $connectTimeout,
                'CURLOPT_CUSTOMREQUEST' => 'GET',
                'CURLOPT_WRITEFUNCTION' => 'stream: aborta ao receber qrcode no SSE/JSON',
            ],
            'env_API_BOT_QR_TIMEOUT' => $timeout,
            'access_token' => ($this->token !== null && $this->token !== '') ? $this->token : null,
            'access_token_present' => ($this->token !== null && $this->token !== ''),
            'how_to_get_token' => [
                'swagger_docs' => $docsUrl,
                'login_post_url' => $loginUrl,
                'login_content_type' => 'application/x-www-form-urlencoded',
                'login_body_fields' => ['username' => 'e-mail ou usuário', 'password' => 'senha'],
                'response_json_field' => 'access_token',
                'example_httpx_login' => 'r = client.post("' . $loginUrl . '", data={"username": EMAIL, "password": SENHA}); token = r.json().get("access_token")',
            ],
            'replicate_as_curl' => $curlLineWithToken,
            'replicate_as_curl_redacted' => $curlLineRedacted,
            'replicate_as_httpx_python' => $httpxWithToken,
            'replicate_as_httpx_python_redacted' => $httpxRedacted,
            'nota' => 'access_token e curl com token = sessão atual do utilizador logado no painel. Sem login, use how_to_get_token ou a variante _redacted.',
            'security_note' => 'Não publique este JSON: o access_token permite agir como o seu utilizador na API SaaS.',
            'sse_note' => 'A SaaS pode manter GET /bot/qr aberto (SSE). O proxy PHP acumula o corpo, faz parse a cada chunk e encerra a ligação assim que surgir qrcode; em timeout (28) reutiliza o buffer já recebido.',
        ];

        /*
         * SSE: o servidor raramente fecha a ligação — CURLOPT_TIMEOUT no transfer inteiro dispara errno 28
         * mesmo com dezenas de KB já recebidos. Solução: CURLOPT_WRITEFUNCTION acumula e, ao detectar
         * qrcode/qrcode_base64 no parse, devolve 0 para abortar (CURLE_WRITE_ERROR). Em timeout, faz-se
         * parse do acumulado antes de falhar.
         */
        $accumulated = '';
        $earlyQrPayload = null;

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => $connectTimeout,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_WRITEFUNCTION => function ($curl, string $data) use (&$accumulated, &$earlyQrPayload): int {
                $accumulated .= $data;
                $parsed = $this->parseBotQrSseOrJson($accumulated);
                if (
                    $parsed !== null
                    && (!empty($parsed['qrcode']) || !empty($parsed['qrcode_base64']))
                ) {
                    $earlyQrPayload = $parsed;

                    return 0;
                }

                return \strlen($data);
            },
        ]);
        curl_exec($ch);
        $info = curl_getinfo($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        curl_close($ch);

        $httpCode = (int) ($info['http_code'] ?? 0);
        $bytesDl = (int) ($info['size_download'] ?? 0);
        $totalTime = (float) ($info['total_time'] ?? 0);

        $this->lastBotQrOutboundDebug['metrics_after_request'] = [
            'http_code' => $httpCode,
            'bytes_downloaded' => $bytesDl,
            'total_time_seconds' => $totalTime,
            'curl_errno' => $errno,
            'curl_error_string' => $error !== '' ? $error : null,
            'stream_aborted_early_because_qr' => $earlyQrPayload !== null,
        ];

        $responseRaw = $accumulated;
        if ($responseRaw !== '') {
            $maxPreview = 2500;
            $this->lastBotQrOutboundDebug['response_body_preview'] = strlen($responseRaw) > $maxPreview
                ? substr($responseRaw, 0, $maxPreview) . '… [truncado]'
                : $responseRaw;
            $this->lastBotQrOutboundDebug['response_body_length'] = strlen($responseRaw);
        }

        if ($earlyQrPayload !== null) {
            return $earlyQrPayload;
        }

        $timedOut = ($errno === \CURLE_OPERATION_TIMEDOUT);
        $writeAborted = ($errno === \CURLE_WRITE_ERROR);

        if ($error !== '') {
            if ($timedOut && $responseRaw !== '') {
                $recovered = $this->parseBotQrSseOrJson($responseRaw);
                if (
                    $recovered !== null
                    && (!empty($recovered['qrcode']) || !empty($recovered['qrcode_base64']))
                ) {
                    $this->lastBotQrOutboundDebug['metrics_after_request']['recovered_from_timeout_buffer'] = true;

                    return $recovered;
                }
                if ($recovered !== null) {
                    $this->lastBotQrOutboundDebug['metrics_after_request']['partial_sse_after_timeout'] = true;

                    return array_merge($recovered, [
                        'stream_timeout' => true,
                        'detail' => ($recovered['detail'] ?? 'Stream encerrou por tempo limite sem QR final; tente novamente ou aumente API_BOT_QR_TIMEOUT no .env.'),
                    ]);
                }
            }
            if ($writeAborted && $responseRaw === '') {
                throw new \RuntimeException("Erro ao conectar na API: $error");
            }
            if (!$writeAborted) {
                throw new \RuntimeException("Erro ao conectar na API: $error");
            }
        }

        if ($httpCode >= 400) {
            $parsed = $this->parseBotQrSseOrJson($responseRaw);
            $msg = 'QR indisponível';
            if (is_array($parsed)) {
                if (isset($parsed['detail'])) {
                    $d = $parsed['detail'];
                    $msg = is_string($d) ? $d : (is_array($d) ? json_encode($d, JSON_UNESCAPED_UNICODE) : $msg);
                } elseif (isset($parsed['error']) && is_string($parsed['error'])) {
                    $msg = $parsed['error'];
                } elseif (isset($parsed['message']) && is_string($parsed['message'])) {
                    $msg = $parsed['message'];
                }
            }
            throw new ApiException(
                $msg,
                $httpCode,
                is_array($parsed) ? $parsed : [],
                $url,
                'GET',
                null,
                $responseRaw,
                false
            );
        }

        $data = $this->parseBotQrSseOrJson($responseRaw);
        if ($data === null) {
            return [
                'ready' => false,
                'qrcode' => null,
                'qrcode_base64' => null,
                'detail' => 'Resposta vazia ou não é JSON/SSE reconhecível.',
            ];
        }

        return $data;
    }

    public function botStart(): array
    {
        return $this->postNoBody('/api/v1/bot/start');
    }

    public function botStop(): array
    {
        return $this->postNoBody('/api/v1/bot/stop');
    }

    public function botRestart(): array
    {
        return $this->postNoBody('/api/v1/bot/restart');
    }

    public function botLogout(): array
    {
        return $this->delete('/api/v1/bot/logout');
    }

    // --- Billing ---

    public function billingPlans(): array
    {
        return $this->get('/api/v1/billing/plans');
    }

    public function billingMySubscription(): array
    {
        return $this->get('/api/v1/billing/my-subscription');
    }

    public function billingSubscribe(string $planId): array
    {
        return $this->post('/api/v1/billing/subscribe/' . rawurlencode($planId), []);
    }

    public function billingCheckout(string $planId, array $payload = []): array
    {
        return $this->post('/api/v1/billing/checkout/' . rawurlencode($planId), $payload);
    }

    public function billingWebhook(string $provider, array $payload): array
    {
        return $this->post('/api/v1/billing/webhook/' . rawurlencode($provider), $payload);
    }

    public function billingDashboard(): array
    {
        return $this->get('/api/v1/billing/dashboard');
    }

    // --- Campaigns ---

    public function listCampaigns(): array
    {
        return $this->get('/api/v1/campaigns/');
    }

    public function createCampaign(array $payload): array
    {
        return $this->post('/api/v1/campaigns/', $payload);
    }

    public function scheduleCampaign(string $campaignId, array $payload = []): array
    {
        return $this->post('/api/v1/campaigns/' . rawurlencode($campaignId) . '/schedule', $payload);
    }

    public function pauseCampaign(string $campaignId): array
    {
        return $this->post('/api/v1/campaigns/' . rawurlencode($campaignId) . '/pause', []);
    }

    public function getCampaign(string $campaignId): array
    {
        return $this->get('/api/v1/campaigns/' . rawurlencode($campaignId));
    }

    // --- Contacts ---

    public function listContacts(): array
    {
        return $this->get('/api/v1/contacts/');
    }

    public function contactsImport(array $payload): array
    {
        return $this->post('/api/v1/contacts/import', $payload);
    }

    public function contactsOptOut(string $phone): array
    {
        return $this->post('/api/v1/contacts/' . rawurlencode($phone) . '/opt-out', []);
    }

    public function contactsTags(): array
    {
        return $this->get('/api/v1/contacts/tags');
    }

    /**
     * POST /api/v1/contacts/import com ficheiro (multipart, campo predefinido "file" — alinhar com o OpenAPI da SaaS).
     *
     * @param array{tmp_name:string,name?:string,type?:string} $file típico de $_FILES['file']
     */
    public function contactsImportUpload(array $file, string $fieldName = 'file'): array
    {
        $tmp = $file['tmp_name'] ?? '';
        if ($tmp === '' || !is_readable($tmp)) {
            throw new \InvalidArgumentException('Ficheiro de upload inválido.');
        }
        $name = $file['name'] ?? 'upload.bin';
        $type = $file['type'] ?? 'application/octet-stream';
        $cfile = new \CURLFile($tmp, $type, $name);

        return $this->postMultipart('/api/v1/contacts/import', [$fieldName => $cfile]);
    }

    /**
     * POST /api/v1/storage/upload — upload de mídia (campo multipart "file", alinhado com test_api_whatsapp_media.js).
     *
     * @param array{tmp_name:string,name?:string,type?:string} $file típico de $_FILES['file']
     */
    public function storageUpload(array $file, string $fieldName = 'file'): array
    {
        $tmp = $file['tmp_name'] ?? '';
        if ($tmp === '' || !is_readable($tmp)) {
            throw new \InvalidArgumentException('Ficheiro de upload inválido.');
        }
        $name = $file['name'] ?? 'upload.bin';
        $type = $file['type'] ?? 'application/octet-stream';
        $cfile = new \CURLFile($tmp, $type, $name);

        return $this->postMultipart('/api/v1/storage/upload', [$fieldName => $cfile]);
    }

    public function listContactsWhatsapp(): array
    {
        return $this->get('/api/v1/contacts/whatsapp');
    }

    public function contactsWhatsappAdd(array $payload): array
    {
        return $this->post('/api/v1/contacts/whatsapp', $payload);
    }

    /** PUT /api/v1/contacts/whatsapp/{phone} — editar contato WhatsApp e na base (OpenAPI SaaS). */
    public function contactsWhatsappUpdate(string $phone, array $payload): array
    {
        return $this->put('/api/v1/contacts/whatsapp/' . rawurlencode($phone), $payload);
    }

    /** DELETE /api/v1/contacts/whatsapp/{phone} */
    public function contactsWhatsappDelete(string $phone): array
    {
        return $this->delete('/api/v1/contacts/whatsapp/' . rawurlencode($phone));
    }

    // --- Admin ---

    public function adminTenantsSummary(): array
    {
        return $this->get('/api/v1/admin/tenants/summary');
    }

    public function adminTransactions(): array
    {
        return $this->get('/api/v1/admin/transactions');
    }

    public function adminToggleMaintenance(array $payload): array
    {
        return $this->post('/api/v1/admin/system/maintenance', $payload);
    }

    // --- Aliases para compatibilidade com código que usava os nomes antigos ---

    public function getFlows(): array
    {
        return $this->listFlows();
    }

    public function createOrUpdateFlow(array $flowDefinition): array
    {
        return $this->createFlow($flowDefinition);
    }

    public function getChatHistory(string $conversationId): array
    {
        return $this->chatHistory($conversationId);
    }

    public function sendChatMessage(string $conversationId, string $content): array
    {
        return $this->chatSend([
            'conversation_id' => $conversationId,
            'content' => $content,
        ]);
    }
}
