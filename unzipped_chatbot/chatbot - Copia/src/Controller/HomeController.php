<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\ApiException;
use App\Service\OmniChannelApiClient;
use App\Support\ContactListPayload;
use App\Support\ConversationId;
use App\Support\PublicBasePath;

class HomeController
{
    public function index(): void
    {
        $contacts = [];
        $user = [];
        $error = null;

        if (!empty($_SESSION['omni_token'])) {
            $api = new OmniChannelApiClient();
            try {
                $user = $api->authMe();
                if (!is_array($user)) {
                    $user = [];
                } else {
                    self::syncTenantIdFromUser($user);
                }
            } catch (\Throwable $e) {
                $user = [];
            }

            try {
                $data = $api->listContacts();
                $contacts = ContactListPayload::extractRows(is_array($data) ? $data : []);
                if ($contacts === []) {
                    try {
                        $wa = $api->listContactsWhatsapp();
                        $contacts = ContactListPayload::extractRows(is_array($wa) ? $wa : []);
                    } catch (\Throwable $e) {
                        // Rota opcional na SaaS
                    }
                }
                foreach ($contacts as $i => $row) {
                    $contacts[$i]['_utalk_conversation_id'] = ConversationId::fromContactOrConversation($row);
                }
            } catch (ApiException $e) {
                $error = $e->getMessage();
                $contacts = [];
            } catch (\Throwable $e) {
                $error = 'Erro ao carregar contatos: ' . $e->getMessage();
                $contacts = [];
            }
        }

        $base = PublicBasePath::fromRequest();
        require dirname(__DIR__, 2) . '/views/home.php';
    }

    /** Preenche X-Tenant-ID na sessão a partir de /auth/me quando o login não devolve tenant. */
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
