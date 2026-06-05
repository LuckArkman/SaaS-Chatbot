<?php

declare(strict_types=1);

namespace App\Controller;

use App\Bootstrap;
use App\Service\OmniChannelApiClient;
use App\Service\ApiException;
use App\Support\ConversationId;
use App\Support\ProgramadorAccess;
use App\Support\SaaSEndpointHints;

/**
 * Expõe endpoints JSON para o front consumir a API OmniChannel (contatos, chat, auth, bot).
 * Todas as rotas exigem sessão autenticada (omni_token).
 */
class ApiOmniController
{
    private function requireAuth(): OmniChannelApiClient
    {
        if (empty($_SESSION['omni_token'])) {
            $this->json(['error' => 'Não autorizado'], 401);
            exit;
        }
        return new OmniChannelApiClient();
    }

    private function json(array $data, int $code = 200): void
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    /**
     * Corpo JSON comum quando o proxy do bot falha na SaaS (402, 404, etc.).
     *
     * @return array<string, mixed>
     */
    private function botProxyErrorPayload(ApiException $e): array
    {
        $code = $e->getStatusCode();
        $payload = [
            'error' => $e->getMessage(),
            'saas_http_status' => $code,
            'saas_api_route' => $e->getRequestUrl(),
            'api_route_full' => $e->getRequestUrl(),
            'saas_method' => $e->getRequestMethod(),
            'api_method' => $e->getRequestMethod(),
        ];
        $saas = $e->getResponse();
        if (is_array($saas) && $saas !== []) {
            $payload['saas_api_response'] = $saas;
        }
        if ($code === 402) {
            $payload['utalk_code'] = 'payment_required';
            $payload['utalk_hint_pt'] = 'A API backend (SaaS) respondeu HTTP 402 (Pagamento necessário). O tenant precisa de plano, assinatura ativa ou trial válido para usar o WhatsApp bot. O painel UTalk só reencaminha o pedido — resolva no billing da API ou no painel do fornecedor SaaS.';
        } elseif ($code === 404) {
            $payload['utalk_code'] = 'saas_not_found';
            $payload['utalk_hint_pt'] = 'A API devolveu HTTP 404 nesta rota do bot. Confira no .env o API_BASE_URL (deve ser a base correta do serviço), se existem GET /api/v1/bot/ e POST /api/v1/bot/start na versão implantada, e se o módulo bot está ativo. Se antes via 402 e depois 404, pode ter mudado URL, token ou o serviço foi redesenhado.';
        } elseif ($code === 403) {
            $payload['utalk_code'] = 'forbidden';
            $payload['utalk_hint_pt'] = 'A API recusou o pedido (403). Verifique JWT, cabeçalho X-Tenant-ID e permissões da conta na SaaS.';
        } elseif ($code === 401) {
            $payload['utalk_code'] = 'unauthorized';
            $payload['utalk_hint_pt'] = 'A API recusou autenticação (401). Faça logout e login de novo no painel para renovar o token.';
        }

        return $payload;
    }

    public function contacts(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->listContacts();
            $contacts = \App\Support\ContactListPayload::extractRows(is_array($data) ? $data : []);
            
            if ($contacts === []) {
                try {
                    $wa = $api->listContactsWhatsapp();
                    $data = is_array($wa) ? $wa : ['items' => [], 'total' => 0];
                } catch (\Throwable $e) {
                    // Ignora
                }
            }
            $this->json(is_array($data) ? $data : ['items' => [], 'total' => 0]);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao carregar contatos.'], 500);
        }
    }

    /** GET → SaaS GET /api/v1/contacts/tags */
    public function contactsTags(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->contactsTags();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao listar tags.'], 500);
        }
    }

    /**
     * POST multipart → SaaS POST /api/v1/storage/upload (campo file).
     * Equivalente a test_api_whatsapp_media.js → testMediaUpload().
     */
    public function storageUpload(): void
    {
        $api = $this->requireAuth();
        if (empty($_FILES['file']['tmp_name']) || !is_uploaded_file((string) $_FILES['file']['tmp_name'])) {
            $this->json(['error' => 'Envie multipart/form-data com campo file.'], 400);

            return;
        }
        try {
            $data = $api->storageUpload($_FILES['file']);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\InvalidArgumentException $e) {
            $this->json(['error' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao enviar ficheiro para storage.'], 500);
        }
    }

    public function contactsImport(): void
    {
        $api = $this->requireAuth();
        try {
            if (!empty($_FILES['file']['tmp_name']) && is_uploaded_file((string) $_FILES['file']['tmp_name'])) {
                $data = $api->contactsImportUpload($_FILES['file']);
            } else {
                $raw = file_get_contents('php://input');
                $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : null;
                if (!is_array($body)) {
                    $this->json([
                        'error' => 'Envie multipart/form-data com campo file (CSV/etc.) ou JSON no corpo, conforme o OpenAPI da SaaS.',
                    ], 400);

                    return;
                }
                $data = $api->contactsImport($body);
            }
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\InvalidArgumentException $e) {
            $this->json(['error' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao importar contatos.'], 500);
        }
    }

    /** POST ?phone= → SaaS POST /api/v1/contacts/{phone}/opt-out */
    public function contactsOptOut(): void
    {
        $api = $this->requireAuth();
        $phone = trim((string) ($_GET['phone'] ?? $_POST['phone'] ?? ''));
        if ($phone === '') {
            $this->json(['error' => 'Parâmetro phone obrigatório (ex.: ?phone=5511999999999).'], 400);

            return;
        }
        try {
            $data = $api->contactsOptOut($phone);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao registar opt-out.'], 500);
        }
    }

    /** GET → SaaS GET /api/v1/contacts/whatsapp */
    public function contactsWhatsappList(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->listContactsWhatsapp();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao listar contatos WhatsApp.'], 500);
        }
    }

    /** POST JSON → SaaS POST /api/v1/contacts/whatsapp */
    public function contactsWhatsappAdd(): void
    {
        $api = $this->requireAuth();
        $raw = file_get_contents('php://input');
        $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : null;
        if (!is_array($body)) {
            $this->json(['error' => 'Envie JSON no corpo conforme o schema da SaaS.'], 400);

            return;
        }
        try {
            $data = $api->contactsWhatsappAdd($body);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao adicionar contato WhatsApp.'], 500);
        }
    }

    /** PUT JSON + query phone= → SaaS PUT /api/v1/contacts/whatsapp/{phone} */
    public function contactsWhatsappUpdate(): void
    {
        $api = $this->requireAuth();
        $phone = trim((string) ($_GET['phone'] ?? ''));
        if ($phone === '') {
            $this->json(['error' => 'Parâmetro phone obrigatório na query (ex.: dígitos com DDI).'], 400);

            return;
        }
        $raw = file_get_contents('php://input');
        $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : null;
        if (!is_array($body)) {
            $this->json(['error' => 'Envie JSON no corpo conforme o schema da SaaS.'], 400);

            return;
        }
        try {
            $data = $api->contactsWhatsappUpdate($phone, $body);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao atualizar contato WhatsApp.'], 500);
        }
    }

    /** DELETE + query phone= → SaaS DELETE /api/v1/contacts/whatsapp/{phone} */
    public function contactsWhatsappDelete(): void
    {
        $api = $this->requireAuth();
        $phone = trim((string) ($_GET['phone'] ?? ''));
        if ($phone === '') {
            $this->json(['error' => 'Parâmetro phone obrigatório na query.'], 400);

            return;
        }
        try {
            $data = $api->contactsWhatsappDelete($phone);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao eliminar contato WhatsApp.'], 500);
        }
    }

    /**
     * POST JSON (corpo) + query channel_type → SaaS POST /api/v1/gateway/webhook/{channel_type}
     */
    public function gatewayWebhook(): void
    {
        $api = $this->requireAuth();
        $channelType = trim((string) ($_GET['channel_type'] ?? ''));
        if ($channelType === '') {
            $this->json(['error' => 'Parâmetro channel_type obrigatório na query (ex.: ?channel_type=whatsapp).'], 400);

            return;
        }
        $raw = file_get_contents('php://input');
        $payload = [];
        if ($raw !== false && trim((string) $raw) !== '') {
            $decoded = json_decode((string) $raw, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->json(['error' => 'Body deve ser JSON válido ou vazio.'], 400);

                return;
            }
            $payload = is_array($decoded) ? $decoded : [];
        }
        if (
            is_array($payload)
            && ($payload['method'] ?? null) === 'receive_message'
            && isset($payload['params'])
            && is_array($payload['params'])
        ) {
            $payload = $payload['params'];
        }
        try {
            $data = $api->gatewayWebhook($channelType, $payload);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao chamar gateway webhook.'], 500);
        }
    }

    public function chatHistory(): void
    {
        $api = $this->requireAuth();
        $conversationId = trim($_GET['conversation_id'] ?? '');
        if ($conversationId === '') {
            $this->json(['error' => 'conversation_id obrigatório'], 400);
            return;
        }
        $conversationId = ConversationId::toWhatsAppJidIfBareNumber($conversationId);
        try {
            $data = $api->chatHistory($conversationId);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao carregar histórico.'], 500);
        }
    }

    public function chatSend(): void
    {
        $api = $this->requireAuth();
        $raw = file_get_contents('php://input');
        $body = $raw !== false ? json_decode($raw, true) : null;
        $debug = ($_GET['debug_api'] ?? '') === '1' || (string) ($_SERVER['HTTP_X_DEBUG_PROXY'] ?? '') === '1';
        if (!is_array($body)) {
            $this->json(['error' => 'Envie JSON com conversation_id e content (ou notificação receive_message).'], 400);

            return;
        }
        $unwrapped = ConversationId::chatSendBodyFromReceiveMessageRpc($body);
        if (is_array($unwrapped)) {
            $body = $unwrapped;
        } else {
            if (empty($body['conversation_id']) && !empty($body['to'])) {
                $body['conversation_id'] = ConversationId::toWhatsAppJidIfBareNumber((string) $body['to']);
            } elseif (isset($body['conversation_id'])) {
                $body['conversation_id'] = ConversationId::toWhatsAppJidIfBareNumber((string) $body['conversation_id']);
            }
        }
        if (!array_key_exists('content', $body)) {
            $body['content'] = '';
        }
        if (!empty($body['mediaUrl']) && empty($body['media_url'])) {
            $body['media_url'] = $body['mediaUrl'];
        }
        $hasMedia = !empty($body['media_url']) || !empty($body['mediaUrl']);
        if (empty($body['conversation_id']) || (!$hasMedia && (string) ($body['content'] ?? '') === '' && empty($body['type']))) {
            $this->json([
                'error' => 'Envie conversation_id (ou to) e content, ou media_url/type para mídia, ou { "method": "receive_message", "params": { ... } }',
            ], 400);

            return;
        }
        try {
            // Reencaminha o corpo completo (texto, anexos, etc.) conforme o schema em /docs — mínimo: conversation_id + content
            $data = $api->chatSend($body);
            $payload = is_array($data) ? $data : [];
            if ($debug) {
                $payload['_proxy_debug'] = [
                    'saas_request_url' => rtrim($api->getConfiguredBaseUrl(), '/') . '/api/v1/chat/send',
                    'saas_request_method' => 'POST',
                    'request_body_received' => $body,
                    'request_body_raw' => $raw !== false ? $raw : '',
                    'request_body_forwarded_to_saas' => $body,
                    'saas_response_body' => $payload,
                    'note' => 'request_body_received é o JSON recebido do frontend e enviado à SaaS em /api/v1/chat/send.',
                ];
            }
            $this->json($payload);
        } catch (ApiException $e) {
            $payload = ['error' => $e->getMessage()];
            if ($debug) {
                $payload['_proxy_debug'] = [
                    'request_body_received' => $body,
                    'request_body_raw' => $raw !== false ? $raw : '',
                    'saas_request_url' => $e->getRequestUrl(),
                    'saas_request_method' => $e->getRequestMethod(),
                    'saas_request_body' => $e->getRequestBody(),
                    'saas_response' => $e->getResponse(),
                    'saas_response_raw' => $e->getResponseRaw(),
                ];
            }
            $this->json($payload, $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao enviar mensagem.'], 500);
        }
    }

    /**
     * POST /api/omni/chat/typing
     * OpenAPI SaaS: POST /api/v1/chat/typing com query conversation_id + is_typing (boolean), sem body.
     * Aceita também JSON { conversation_id, is_typing } para o front continuar simples.
     */
    public function chatTyping(): void
    {
        $api = $this->requireAuth();
        $raw = file_get_contents('php://input');
        $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : null;
        $cid = trim($_GET['conversation_id'] ?? '');
        $typingRaw = $_GET['is_typing'] ?? null;
        if ($cid === '' && is_array($body) && !empty($body['conversation_id'])) {
            $cid = trim((string) $body['conversation_id']);
        }
        if ($typingRaw === null && is_array($body) && array_key_exists('is_typing', $body)) {
            $typingRaw = $body['is_typing'];
        }
        if ($typingRaw === null && is_array($body) && array_key_exists('typing', $body)) {
            $typingRaw = $body['typing'];
        }
        if ($cid === '' || $typingRaw === null) {
            $this->json([
                'error' => 'conversation_id e is_typing obrigatórios (query ou JSON). OpenAPI SaaS: query na rota /api/v1/chat/typing.',
            ], 400);

            return;
        }
        $cid = ConversationId::toWhatsAppJidIfBareNumber($cid);
        $isTyping = filter_var($typingRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($isTyping === null) {
            $isTyping = in_array(strtolower((string) $typingRaw), ['1', 'true', 'yes', 'on'], true);
        }
        try {
            $data = $api->chatTyping($cid, $isTyping);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao enviar typing.'], 500);
        }
    }

    /**
     * POST /api/omni/chat/transfer?conversation_id=&target_agent_id=
     * OpenAPI SaaS: path …/transfer/{conversation_id} + query target_agent_id (integer). Sem body.
     * Aceita target_agent_id também no JSON { target_agent_id } ou legado { target_user_id }.
     */
    public function chatTransfer(): void
    {
        $api = $this->requireAuth();
        $conversationId = trim($_GET['conversation_id'] ?? '');
        if ($conversationId === '') {
            $this->json(['error' => 'Query conversation_id obrigatório'], 400);

            return;
        }
        $conversationId = ConversationId::toWhatsAppJidIfBareNumber($conversationId);
        $raw = file_get_contents('php://input');
        $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : [];
        if (!is_array($body)) {
            $body = [];
        }
        $tid = $_GET['target_agent_id'] ?? null;
        if ($tid === null || $tid === '') {
            if (isset($body['target_agent_id'])) {
                $tid = $body['target_agent_id'];
            } elseif (isset($body['target_user_id'])) {
                $tid = $body['target_user_id'];
            }
        }
        $targetAgentId = (int) $tid;
        if ($targetAgentId <= 0) {
            $this->json([
                'error' => 'target_agent_id obrigatório (inteiro). Nome oficial no OpenAPI da SaaS; use query ou JSON.',
            ], 400);

            return;
        }
        try {
            $data = $api->chatTransfer($conversationId, $targetAgentId);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao transferir conversa.'], 500);
        }
    }

    /** GET /api/omni/chat/presence?user_id= — Swagger: GET /api/v1/chat/presence/{user_id} */
    public function chatPresence(): void
    {
        $api = $this->requireAuth();
        $userId = trim($_GET['user_id'] ?? '');
        if ($userId === '') {
            $this->json(['error' => 'Query user_id obrigatório'], 400);

            return;
        }
        try {
            $data = $api->chatPresence($userId);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter presença.'], 500);
        }
    }

    public function authMe(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->authMe();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter usuário.'], 500);
        }
    }

    /**
     * URL WebSocket JSON-RPC da SaaS com token da sessão (para o painel Conversas atualizar ao receber push).
     */
    public function authWsConfig(): void
    {
        $this->requireAuth();
        $token = trim((string) ($_SESSION['omni_token'] ?? ''));
        $hints = SaaSEndpointHints::fromApiBaseUrl(Bootstrap::env('API_BASE_URL', ''));
        $tpl = $hints['ws_rpc_uri_template'];
        if ($tpl === '') {
            $this->json([
                'enabled' => false,
                'reason' => 'missing_api_base_url',
                'message' => 'Defina API_BASE_URL no .env (mesmo host/porta da API SaaS) para o WebSocket funcionar no painel.',
            ]);

            return;
        }
        $wsUrl = str_replace('token=JWT', 'token=' . rawurlencode($token), $tpl);
        $this->json([
            'enabled' => true,
            'ws_url' => $wsUrl,
        ]);
    }

    public function botStatus(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->botStatus();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter status do bot.'], 500);
        }
    }

    /** GET /api/omni/bot/qr – Obtém QR Code da instância WhatsApp. */
    public function botQr(): void
    {
        $api = $this->requireAuth();
        $saasQrUrl = $api->getConfiguredBaseUrl() . '/api/v1/bot/qr';
        try {
            $data = $api->botQr();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $code = $e->getStatusCode();
            $saas = $e->getResponse();
            $texto = $e->getMessage();
            if (is_array($saas) && isset($saas['error']) && is_string($saas['error'])) {
                $texto = $saas['error'];
            }
            /*
             * A SaaS (ex. Baileys) responde HTTP 404 quando o QR ainda não foi gerado ou expirou —
             * a rota /api/v1/bot/qr existe; 404 é estado de negócio (igual ao script Python que faz polling).
             * Devolvemos 200 ao front para não parecer "Not Found" da aplicação.
             */
            if ($code === 404) {
                $payload404 = [
                    'ready' => false,
                    'qrcode' => null,
                    'qrcode_base64' => null,
                    'detail' => $texto,
                    'saas_http_status' => 404,
                    'saas_api_route' => $e->getRequestUrl() !== '' ? $e->getRequestUrl() : $saasQrUrl,
                    'saas_method' => 'GET',
                    'nota' => 'Rota OK na SaaS: 404 aqui significa QR pendente ou expirado — tente de novo após /bot/start ou aguarde (polling).',
                ];
                $dbg = $api->getLastBotQrOutboundDebug();
                if (is_array($dbg) && $dbg !== []) {
                    $payload404['request_sent_to_saas'] = $dbg;
                }
                $this->json($payload404, 200);

                return;
            }
            $payload = [
                'error' => $texto,
                'saas_api_route' => $e->getRequestUrl() !== '' ? $e->getRequestUrl() : $saasQrUrl,
                'saas_method' => $e->getRequestMethod() !== '' ? $e->getRequestMethod() : 'GET',
            ];
            if ($saas !== []) {
                $payload['saas_api_response'] = $saas;
            }
            $raw = $e->getResponseRaw();
            if ($raw !== '') {
                $max = 8000;
                $payload['saas_api_response_raw'] = strlen($raw) > $max ? substr($raw, 0, $max) . '…' : $raw;
            }
            $dbg = $api->getLastBotQrOutboundDebug();
            if (is_array($dbg) && $dbg !== []) {
                $payload['request_sent_to_saas'] = $dbg;
            }
            $this->json($payload, $code);
        } catch (\Throwable $e) {
            $payload500 = [
                'error' => 'Erro ao obter QR do bot.',
                'detail' => $e->getMessage(),
                'exception_class' => \get_class($e),
                'saas_api_route' => $saasQrUrl,
                'saas_method' => 'GET',
                'hint' => 'O PHP chamou GET nesta URL (API_BASE_URL + /api/v1/bot/qr). Verifique .env, firewall e se o serviço responde a partir deste servidor.',
            ];
            $dbg = $api->getLastBotQrOutboundDebug();
            if (is_array($dbg) && $dbg !== []) {
                $payload500['request_sent_to_saas'] = $dbg;
            }
            $this->json($payload500, 500);
        }
    }

    /** POST /api/omni/bot/start – Inicia/sincroniza instância WhatsApp (pode retornar QR em base64). */
    public function botStart(): void
    {
        $api = $this->requireAuth();
        try {
            // Mesma sequência do script Python [5/6]: GET /api/v1/bot/ e depois POST /api/v1/bot/start
            try {
                $api->botStatus();
            } catch (ApiException $e) {
                // Status pode falhar; ainda tentamos start (comportamento útil para diagnóstico)
            }
            $data = $api->botStart();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $payload = $this->botProxyErrorPayload($e);
            $reqBody = $e->getRequestBody();
            if ($e->getRequestHadNoBody()) {
                $payload['api_request_no_body'] = true;
                $payload['api_request_body'] = null;
                $payload['api_request_note'] = 'Igual ao Python: headers com Content-Type: application/json e Authorization: Bearer; POST /bot/start sem json= nem data= (corpo vazio). Antes, o script faz GET /api/v1/bot/. Timeout 30s (API_BOT_TIMEOUT).';
                $sessionToken = $_SESSION['omni_token'] ?? null;
                $tokenLen = is_string($sessionToken) ? strlen($sessionToken) : 0;
                $tokenPrefix = is_string($sessionToken) && $tokenLen > 0 ? substr($sessionToken, 0, 10) : '';
                $tokenSuffix = is_string($sessionToken) && $tokenLen > 4 ? substr($sessionToken, -4) : '';
                $tokenSha = is_string($sessionToken) && $tokenLen > 0 ? hash('sha256', $sessionToken) : '';
                $headersInfo = [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    // Não expomos o token completo (é credencial); mostramos somente dados para validação.
                    'Authorization' => 'Bearer ' . ($sessionToken ? ($tokenPrefix . '…' . $tokenSuffix) : '<ausente>'),
                    'token_present' => (bool) $sessionToken,
                    'token_length' => $tokenLen,
                    'token_prefix' => $tokenPrefix,
                    'token_suffix' => $tokenSuffix,
                    'token_sha256' => $tokenSha,
                ];
                $tid = $_SESSION['omni_tenant_id'] ?? null;
                if ($tid !== null && $tid !== '') {
                    $headersInfo['X-Tenant-ID'] = (string) $tid;
                }
                $payload['api_headers_sent'] = $headersInfo;
            } else {
                $payload['api_request_body'] = $reqBody ?? [];
                $payload['api_request_body_json'] = json_encode($reqBody ?? [], JSON_UNESCAPED_UNICODE);
            }
            $raw = $e->getResponseRaw();
            if ($raw !== '') {
                $max = 12000;
                $payload['saas_api_response_raw'] = strlen($raw) > $max ? substr($raw, 0, $max) . '…' : $raw;
            }
            $this->json($payload, $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao iniciar bot.'], 500);
        }
    }

    /** POST /api/omni/bot/stop – Para a instância WhatsApp (SaaS: POST /api/v1/bot/stop). */
    public function botStop(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->botStop();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $payload = ['error' => $e->getMessage()];
            $payload['api_route_full'] = $e->getRequestUrl();
            $payload['api_method'] = $e->getRequestMethod();
            $saasResp = $e->getResponse();
            if ($saasResp !== []) {
                $payload['saas_api_response'] = $saasResp;
            }
            $this->json($payload, $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao parar o bot.'], 500);
        }
    }

    /** POST /api/omni/bot/restart – Reinicia a instância WhatsApp (SaaS: POST /api/v1/bot/restart). */
    public function botRestart(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->botRestart();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $payload = ['error' => $e->getMessage()];
            $payload['api_route_full'] = $e->getRequestUrl();
            $payload['api_method'] = $e->getRequestMethod();
            $saasResp = $e->getResponse();
            if ($saasResp !== []) {
                $payload['saas_api_response'] = $saasResp;
            }
            $this->json($payload, $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao reiniciar o bot.'], 500);
        }
    }

    /** DELETE /api/omni/bot/logout – Encerra sessão da instância na SaaS (DELETE /api/v1/bot/logout). */
    public function botLogout(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->botLogout();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json($this->botProxyErrorPayload($e), $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao fazer logout do bot.'], 500);
        }
    }

    /** GET /api/omni/campaigns – Lista campanhas (envios em massa / fila na SaaS: GET /api/v1/campaigns/). */
    public function campaignsList(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->listCampaigns();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao listar campanhas.'], 500);
        }
    }

    /** GET /api/omni/campaign?campaign_id= – Detalhe da campanha (GET /api/v1/campaigns/{id}). */
    public function campaignsGetOne(): void
    {
        $api = $this->requireAuth();
        $id = trim($_GET['campaign_id'] ?? '');
        if ($id === '') {
            $this->json(['error' => 'Parâmetro campaign_id obrigatório'], 400);
            return;
        }
        try {
            $data = $api->getCampaign($id);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter campanha.'], 500);
        }
    }

    /** POST /api/omni/campaigns → SaaS POST /api/v1/campaigns/ (Create Campaign). */
    public function campaignsCreate(): void
    {
        $api = $this->requireAuth();
        $raw = file_get_contents('php://input');
        $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : null;
        if (!is_array($body)) {
            $this->json(['error' => 'Corpo JSON obrigatório (ex.: name, message_template, description, media_url, scheduled_at).'], 400);

            return;
        }
        // UI antiga enviava "message"; a SaaS espera "message_template".
        if (isset($body['message']) && !isset($body['message_template'])) {
            $body['message_template'] = $body['message'];
            unset($body['message']);
        }
        try {
            $data = $api->createCampaign($body);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao criar campanha.'], 500);
        }
    }

    /** POST /api/omni/campaigns/schedule?campaign_id= → SaaS POST /api/v1/campaigns/{id}/schedule */
    public function campaignsSchedule(): void
    {
        $api = $this->requireAuth();
        $id = trim($_GET['campaign_id'] ?? '');
        if ($id === '') {
            $this->json(['error' => 'Parâmetro campaign_id obrigatório (query).'], 400);

            return;
        }
        $raw = file_get_contents('php://input');
        $payload = [];
        if ($raw !== false && trim((string) $raw) !== '') {
            $decoded = json_decode($raw, true);
            $payload = is_array($decoded) ? $decoded : [];
        }
        try {
            $data = $api->scheduleCampaign($id, $payload);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao agendar campanha.'], 500);
        }
    }

    /** POST /api/omni/campaigns/pause?campaign_id= → SaaS POST /api/v1/campaigns/{id}/pause */
    public function campaignsPause(): void
    {
        $api = $this->requireAuth();
        $id = trim($_GET['campaign_id'] ?? '');
        if ($id === '') {
            $this->json(['error' => 'Parâmetro campaign_id obrigatório (query).'], 400);

            return;
        }
        try {
            $data = $api->pauseCampaign($id);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao pausar campanha.'], 500);
        }
    }

    /** GET /api/omni/admin/tenants/summary → SaaS GET /api/v1/admin/tenants/summary */
    public function adminTenantsSummary(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->adminTenantsSummary();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter resumo de tenants.'], 500);
        }
    }

    /** GET /api/omni/admin/transactions → SaaS GET /api/v1/admin/transactions */
    public function adminTransactions(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->adminTransactions();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao listar transações.'], 500);
        }
    }

    /** POST JSON → SaaS POST /api/v1/admin/system/maintenance */
    public function adminSystemMaintenance(): void
    {
        $api = $this->requireAuth();
        $raw = file_get_contents('php://input');
        $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : null;
        if (!is_array($body)) {
            $this->json(['error' => 'Envie JSON no corpo (ex.: conforme OpenAPI da SaaS).'], 400);

            return;
        }
        try {
            $data = $api->adminToggleMaintenance($body);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao alterar modo de manutenção.'], 500);
        }
    }

    /** GET /api/omni/billing/plans → SaaS GET /api/v1/billing/plans */
    public function billingPlans(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->billingPlans();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao listar planos.'], 500);
        }
    }

    /** GET /api/omni/billing/my-subscription */
    public function billingMySubscription(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->billingMySubscription();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter subscrição.'], 500);
        }
    }

    /** GET /api/omni/billing/dashboard */
    public function billingDashboard(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->billingDashboard();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter dashboard financeiro.'], 500);
        }
    }

    /** POST /api/omni/billing/subscribe?plan_id= → SaaS POST /api/v1/billing/subscribe/{plan_id} */
    public function billingSubscribe(): void
    {
        $api = $this->requireAuth();
        $planId = trim($_GET['plan_id'] ?? '');
        if ($planId === '') {
            $this->json(['error' => 'Parâmetro plan_id obrigatório (query).'], 400);

            return;
        }
        try {
            $data = $api->billingSubscribe($planId);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao subscrever plano.'], 500);
        }
    }

    /** POST /api/omni/billing/checkout?plan_id= — corpo JSON opcional */
    public function billingCheckout(): void
    {
        $api = $this->requireAuth();
        $planId = trim($_GET['plan_id'] ?? '');
        if ($planId === '') {
            $this->json(['error' => 'Parâmetro plan_id obrigatório (query).'], 400);

            return;
        }
        $raw = file_get_contents('php://input');
        $payload = [];
        if ($raw !== false && trim((string) $raw) !== '') {
            $decoded = json_decode($raw, true);
            $payload = is_array($decoded) ? $decoded : [];
        }
        try {
            $data = $api->billingCheckout($planId, $payload);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao criar checkout.'], 500);
        }
    }

    /**
     * POST /api/omni/billing/webhook?provider= — encaminha JSON à SaaS (teste manual).
     * Em produção o webhook costuma ser chamado pelo fornecedor de pagamentos diretamente na API.
     */
    public function billingWebhookTest(): void
    {
        $api = $this->requireAuth();
        $provider = trim($_GET['provider'] ?? '');
        if ($provider === '') {
            $this->json(['error' => 'Parâmetro provider obrigatório (ex.: stripe).'], 400);

            return;
        }
        $raw = file_get_contents('php://input');
        $body = $raw !== false && trim((string) $raw) !== '' ? json_decode($raw, true) : null;
        if (!is_array($body)) {
            $this->json(['error' => 'Corpo JSON obrigatório.'], 400);

            return;
        }
        try {
            $data = $api->billingWebhook($provider, $body);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao enviar webhook de teste.'], 500);
        }
    }

    /** GET /api/omni/flows – Lista agentes/fluxos (FlowEngine). */
    public function flowsList(): void
    {
        $api = $this->requireAuth();
        try {
            $data = $api->listFlows();
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao listar fluxos.'], 500);
        }
    }

    /** POST /api/omni/flows – Cria agente/fluxo (FlowCreate). Bluebook: POST /api/v1/flows/ */
    public function flowsCreate(): void
    {
        $api = $this->requireAuth();
        $raw = file_get_contents('php://input');
        $trimmed = $raw !== false ? trim((string) $raw) : '';
        if ($trimmed === '') {
            $this->json(['error' => 'Envie JSON válido (FlowCreate).'], 400);

            return;
        }
        json_decode($trimmed);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->json(['error' => 'Envie JSON válido (FlowCreate).'], 400);

            return;
        }
        $body = json_decode($trimmed, true);
        if (!is_array($body)) {
            $this->json(['error' => 'Envie JSON válido (FlowCreate).'], 400);

            return;
        }
        if (empty($body['name']) || !isset($body['nodes']) || !isset($body['edges'])) {
            $this->json(['error' => 'Campos obrigatórios: name, nodes, edges.'], 400);

            return;
        }
        try {
            // Reencaminhar o JSON original: `data: {}` nos nodes não pode virar `[]` (422 na SaaS).
            $data = $api->createFlowFromRawJson($trimmed);
            $this->json($data, 200);
        } catch (ApiException $e) {
            $status = $e->getStatusCode();
            $payload = ['error' => $e->getMessage()];
            $payload['body_sent_to_saas'] = $body;
            $payload['json_enviado_a_saas_exato'] = $trimmed;
            $payload['nota_proxy'] = 'O PHP envia à SaaS o mesmo JSON do navegador (json_enviado_a_saas_exato). body_sent_to_saas é a versão decodificada em PHP — objetos vazios podem aparecer como [].';
            $saas = $e->getResponse();
            if ($saas !== []) {
                $payload['saas_api_response'] = $saas;
            }
            if ($status === 422 && isset($saas['detail'])) {
                $payload['detail'] = $saas['detail'];
            }
            $this->json($payload, $status);
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao criar fluxo.'], 500);
        }
    }

    /** GET /api/omni/flow?flow_id= – GET /api/v1/flows/{id} */
    public function flowsGetOne(): void
    {
        $api = $this->requireAuth();
        $flowId = trim($_GET['flow_id'] ?? '');
        if ($flowId === '') {
            $this->json(['error' => 'Parâmetro flow_id obrigatório'], 400);
            return;
        }
        try {
            $data = $api->getFlow($flowId);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao obter fluxo.'], 500);
        }
    }

    /** PATCH /api/omni/flow?flow_id= – PATCH /api/v1/flows/{id} */
    public function flowsPatch(): void
    {
        $api = $this->requireAuth();
        $flowId = trim($_GET['flow_id'] ?? '');
        if ($flowId === '') {
            $this->json(['error' => 'Parâmetro flow_id obrigatório'], 400);
            return;
        }
        $raw = file_get_contents('php://input');
        $trimmed = $raw !== false ? trim((string) $raw) : '';
        if ($trimmed === '') {
            $this->json(['error' => 'Envie JSON no corpo'], 400);

            return;
        }
        json_decode($trimmed);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->json(['error' => 'Envie JSON no corpo'], 400);

            return;
        }
        $body = json_decode($trimmed, true);
        if (!is_array($body)) {
            $this->json(['error' => 'Envie JSON no corpo'], 400);

            return;
        }
        try {
            $data = $api->updateFlowFromRawJson($flowId, $trimmed);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $status = $e->getStatusCode();
            $payload = ['error' => $e->getMessage()];
            $payload['body_sent_to_saas'] = $body;
            $payload['json_enviado_a_saas_exato'] = $trimmed;
            $payload['nota_proxy'] = 'PATCH reencaminha o JSON bruto do cliente para preservar `{}` nos nodes.';
            $saas = $e->getResponse();
            if ($saas !== []) {
                $payload['saas_api_response'] = $saas;
            }
            $this->json($payload, $status);
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao atualizar fluxo.'], 500);
        }
    }

    /** DELETE /api/omni/flow?flow_id= – DELETE /api/v1/flows/{id} */
    public function flowsDelete(): void
    {
        $api = $this->requireAuth();
        $flowId = trim($_GET['flow_id'] ?? '');
        if ($flowId === '') {
            $this->json(['error' => 'Parâmetro flow_id obrigatório'], 400);
            return;
        }
        try {
            $data = $api->deleteFlow($flowId);
            $this->json(is_array($data) ? $data : []);
        } catch (ApiException $e) {
            $this->json(['error' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            $this->json(['error' => 'Erro ao remover fluxo.'], 500);
        }
    }

    /** GET /api/omni/openapi-spec — documento OpenAPI da SaaS (acesso exclusivo programador). */
    public function openapiSpec(): void
    {
        $this->requireAuth();
        ProgramadorAccess::requireProgramadorJson();
        $api = new OmniChannelApiClient();
        try {
            $spec = $api->fetchOpenApiSpec();
            $http = $spec['_http'] ?? null;
            unset($spec['_http']);
            $this->json(['openapi' => $spec, 'fetched_status' => $http]);
        } catch (\Throwable $e) {
            $this->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/omni/dev/call — encaminha pedido à API SaaS (só /api/v1/...).
     * Corpo: { "method": "GET", "path": "/api/v1/bot/", "body": {}, "noBody": false, "formUrlEncoded": false }
     */
    public function devCall(): void
    {
        $this->requireAuth();
        ProgramadorAccess::requireProgramadorJson();
        $api = new OmniChannelApiClient();
        $raw = file_get_contents('php://input');
        $input = $raw !== false ? json_decode($raw, true) : null;
        if (!is_array($input)) {
            $this->json(['error' => 'JSON inválido'], 400);

            return;
        }
        $method = (string) ($input['method'] ?? 'GET');
        $path = (string) ($input['path'] ?? '');
        $noBody = !empty($input['noBody']);
        $formUrlEncoded = !empty($input['formUrlEncoded']);
        $body = $input['body'] ?? null;
        if ($body !== null && !is_array($body)) {
            $this->json(['error' => 'body deve ser objeto JSON ou null'], 400);

            return;
        }
        if (self::isDevCallWebsocketPath($path)) {
            $hints = SaaSEndpointHints::fromApiBaseUrl(Bootstrap::env('API_BASE_URL', ''));
            $how = [
                'Substitua JWT pelo Bearer da sessão (login SaaS).',
                'Script: ' . ($hints['python_example_cmd'] !== '' ? $hints['python_example_cmd'] : 'python scripts/test_rpc_ws.py --host HOST --port 8001 --token "JWT" --listen'),
            ];
            if ($hints['ws_rpc_uri_template'] !== '') {
                array_unshift($how, 'WebSocket (a partir do .env): ' . $hints['ws_rpc_uri_template']);
            } else {
                array_unshift($how, 'Defina API_BASE_URL no .env para ver aqui o ws:// exato. Modelo: ws://HOST:PORT/api/v1/ws?token=JWT');
            }
            $this->json([
                'ok' => false,
                'blocked' => 'websocket_only',
                'error' => 'Este path é apenas WebSocket (JSON-RPC). O dev/call usa HTTP e não abre uma ligação ws://.',
                'saas_note' => 'Um GET HTTP pode devolver 200 com a mensagem a pedir WebSocket — isso não é um erro de proxy; o RPC real é por WS.',
                'api_base_url' => $hints['api_base'] !== '' ? $hints['api_base'] : null,
                'ws_rpc_uri_template' => $hints['ws_rpc_uri_template'] !== '' ? $hints['ws_rpc_uri_template'] : null,
                'python_example_cmd' => $hints['python_example_cmd'] !== '' ? $hints['python_example_cmd'] : null,
                'how' => $how,
            ], 400);

            return;
        }
        try {
            $data = $api->devForwardRequest(
                $method,
                $path,
                is_array($body) ? $body : null,
                $noBody,
                $formUrlEncoded
            );
            $this->json(['ok' => true, 'data' => $data], 200);
        } catch (ApiException $e) {
            $this->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'status' => $e->getStatusCode(),
                'saas_response' => $e->getResponse(),
            ], $e->getStatusCode());
        } catch (\InvalidArgumentException $e) {
            $this->json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            $this->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** Rotas como /api/v1/ws não podem ser usadas via dev/call (só HTTP). */
    private static function isDevCallWebsocketPath(string $path): bool
    {
        $path = trim($path);
        if ($path === '') {
            return false;
        }
        $p = explode('?', $path, 2)[0];
        $p = trim($p);
        $p = preg_replace('#/+#', '/', '/' . trim($p, '/'));

        if ($p === '/api/v1/ws') {
            return true;
        }

        return str_starts_with($p, '/api/v1/ws/');
    }
}
