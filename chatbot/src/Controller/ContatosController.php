<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\ApiException;
use App\Service\OmniChannelApiClient;
use App\Support\ContactListPayload;
use App\Support\ConversationId;
use App\Support\PublicBasePath;

class ContatosController
{
    public function index(): void
    {
        $contacts = [];
        $contactsTotal = 0;
        $error = null;

        if (!empty($_SESSION['omni_token'])) {
            try {
                $api = new OmniChannelApiClient();
                try {
                    $me = $api->authMe();
                    if (is_array($me)) {
                        self::syncTenantIdFromUser($me);
                    }
                } catch (\Throwable $e) {
                    // continua; listContacts pode funcionar só com Bearer
                }
                try {
                    $botStatus = $api->botStatus();
                    $isConnected = ($botStatus['status'] ?? '') === 'CONNECTED';
                } catch (\Throwable $e) {
                    $isConnected = false;
                }
                
                if ($isConnected) {
                    $data = $api->listContacts();
                    if (is_array($data)) {
                        $contacts = ContactListPayload::extractRows($data);
                        $contactsTotal = (int) ($data['total'] ?? $data['count'] ?? count($contacts));
                        if ($contacts === []) {
                            try {
                                $wa = $api->listContactsWhatsapp();
                                $contacts = ContactListPayload::extractRows(is_array($wa) ? $wa : []);
                                $contactsTotal = count($contacts);
                            } catch (\Throwable $e) {
                                // opcional
                            }
                        }
                        foreach ($contacts as $i => $row) {
                            $contacts[$i]['_utalk_conversation_id'] = ConversationId::fromContactOrConversation($row);
                        }
                    }
                } else {
                    $contacts = [];
                    $contactsTotal = 0;
                }
            } catch (ApiException $e) {
                $error = $e->getMessage();
            } catch (\Throwable $e) {
                $error = 'Erro ao carregar contatos.';
            }
        }

        $base = PublicBasePath::fromRequest();
        require dirname(__DIR__, 2) . '/views/contatos.php';
    }

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
