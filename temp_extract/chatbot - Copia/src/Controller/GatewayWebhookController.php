<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\ApiException;
use App\Service\OmniChannelApiClient;
use App\Support\ContactListPayload;

/**
 * Página de teste do POST /api/v1/gateway/webhook/{channel_type} com corpo pré-preenchido
 * a partir da sessão (auth/me, tenant) e do primeiro contacto com telefone válido.
 */
final class GatewayWebhookController
{
    public function index(): void
    {
        $gw_channel_default = 'whatsapp';
        $gw_body_default = '{}';
        $gw_prefill_note = null;
        $gw_prefill_error = null;

        if (!empty($_SESSION['omni_token'])) {
            try {
                $api = new OmniChannelApiClient();
                $me = null;
                try {
                    $me = $api->authMe();
                    if (is_array($me)) {
                        self::syncTenantIdFromUser($me);
                    }
                } catch (\Throwable $e) {
                    $gw_prefill_error = 'auth/me: ' . $e->getMessage();
                }

                $samplePhone = '';
                try {
                    $data = $api->listContacts();
                    $rows = ContactListPayload::extractRows(is_array($data) ? $data : []);
                    if ($rows === []) {
                        $wa = $api->listContactsWhatsapp();
                        $rows = ContactListPayload::extractRows(is_array($wa) ? $wa : []);
                    }
                    foreach ($rows as $row) {
                        $p = (string) ($row['phone'] ?? $row['phone_number'] ?? $row['number'] ?? $row['wa_id'] ?? '');
                        $digits = preg_replace('/\D/', '', $p);
                        if (strlen($digits) >= 10) {
                            $samplePhone = $digits;
                            break;
                        }
                    }
                } catch (ApiException $e) {
                    if ($gw_prefill_error === null) {
                        $gw_prefill_error = 'Lista de contactos: ' . $e->getMessage();
                    }
                } catch (\Throwable $e) {
                    if ($gw_prefill_error === null) {
                        $gw_prefill_error = 'Lista de contactos: ' . $e->getMessage();
                    }
                }

                $gw_body_default = self::buildDefaultWebhookJson(is_array($me) ? $me : null, $samplePhone);

                $parts = [];
                if (is_array($me)) {
                    $em = (string) ($me['email'] ?? $me['username'] ?? '');
                    if ($em !== '') {
                        $parts[] = 'utilizador ' . $em;
                    }
                }
                if ($samplePhone !== '') {
                    $parts[] = '1.º telefone na lista: ' . $samplePhone;
                } else {
                    $parts[] = 'telefone no JSON = exemplo 5511999999999 (sem contactos com número)';
                }
                $tid = isset($_SESSION['omni_tenant_id']) ? (string) $_SESSION['omni_tenant_id'] : '';
                if ($tid !== '') {
                    $parts[] = 'tenant_id na sessão: ' . $tid;
                }
                $gw_prefill_note = implode(' · ', $parts);
            } catch (\Throwable $e) {
                if ($gw_prefill_error === null) {
                    $gw_prefill_error = $e->getMessage();
                }
                $gw_body_default = self::buildDefaultWebhookJson(null, '');
            }
        }

        require dirname(__DIR__, 2) . '/views/gateway-webhook.php';
    }

    /**
     * Modelo inspirado em webhooks WhatsApp (ex. Evolution): event + data.
     * A SaaS pode exigir outro schema — confira o OpenAPI em /api/v1/openapi.json.
     *
     * @param array<string, mixed>|null $me
     */
    private static function buildDefaultWebhookJson(?array $me, string $samplePhoneDigits): string
    {
        $tenant = isset($_SESSION['omni_tenant_id']) ? (string) $_SESSION['omni_tenant_id'] : '';
        if ($tenant === '' && is_array($me)) {
            $tid = $me['tenant_id'] ?? $me['tenantId'] ?? null;
            if ($tid === null && isset($me['tenant']) && is_array($me['tenant'])) {
                $t = $me['tenant'];
                $tid = $t['id'] ?? $t['tenant_id'] ?? $t['tenantId'] ?? null;
            }
            if ($tid !== null && (string) $tid !== '') {
                $tenant = (string) $tid;
            }
        }

        $email = '';
        if (is_array($me)) {
            $email = (string) ($me['email'] ?? $me['username'] ?? '');
        }

        if ($samplePhoneDigits === '' || strlen($samplePhoneDigits) < 8) {
            $samplePhoneDigits = '5511999999999';
        }

        $payload = [
            'event' => 'messages.upsert',
            'data' => [
                'from' => $samplePhoneDigits,
                'text' => 'Mensagem de teste (painel UTalk)',
                'timestamp' => (int) round(microtime(true) * 1000),
            ],
        ];

        if ($tenant !== '') {
            $payload['tenant_id'] = ctype_digit($tenant) ? (int) $tenant : $tenant;
        }
        if ($email !== '') {
            $payload['context'] = ['panel_user_email' => $email];
        }

        return json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /** @param array<string, mixed> $user */
    private static function syncTenantIdFromUser(array $user): void
    {
        if (!empty($_SESSION['omni_tenant_id'])) {
            return;
        }
        $tid = $user['tenant_id'] ?? $user['tenantId'] ?? null;
        if ($tid === null && isset($user['tenant']) && is_array($user['tenant'])) {
            $t = $user['tenant'];
            $tid = $t['id'] ?? $t['tenant_id'] ?? $t['tenantId'] ?? null;
        }
        if ($tid !== null && $tid !== '') {
            $_SESSION['omni_tenant_id'] = (string) $tid;
        }
    }
}
