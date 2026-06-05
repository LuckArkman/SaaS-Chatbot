<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Extrai o identificador de conversa usado em GET /api/v1/chat/history/{id} e POST /api/v1/chat/send.
 *
 * Não usa o campo genérico `id` / `_id` do contacto: na API isso costuma ser PK de utilizador/contato,
 * não o id da conversa no chat — enviar isso ao histórico mistura threads ou devolve vazio.
 * Ordem: campos explícitos de conversa → objeto aninhado `conversation` → telefone/JID.
 *
 * Pushes WebSocket `receive_message` trazem `params` com `contact_phone`, `contact: { ... }` e
 * `conversation_id` em formato JID (`5511...@s.whatsapp.net`) — use mergeNestedContactForLookup
 * ou fromReceiveMessageParams para alinhar com a lista de contactos.
 */
final class ConversationId
{
    /**
     * Planifica `contact`, `contact_phone` e `id` numérico do contacto para os mesmos campos que
     * a lista da API (permite tratar contato ainda não persistido a partir do push).
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function mergeNestedContactForLookup(array $row): array
    {
        $m = $row;
        if (!empty($row['contact_phone']) && is_scalar($row['contact_phone'])) {
            $cp = trim((string) $row['contact_phone']);
            if ($cp !== '' && ($m['phone'] ?? '') === '' && ($m['phone_number'] ?? '') === '') {
                $m['phone'] = $cp;
            }
        }
        $c = $row['contact'] ?? null;
        if (!is_array($c)) {
            return $m;
        }
        $fillPhone = static function (string $val) use (&$m): void {
            if (($m['phone'] ?? '') !== '' || ($m['phone_number'] ?? '') !== '') {
                return;
            }
            $digits = preg_replace('/\D/', '', $val) ?? '';
            if (strlen($digits) >= 8) {
                $m['phone_number'] = $digits;
            }
        };
        foreach (['phone_number', 'phone', 'wa_id'] as $k) {
            if (!empty($c[$k]) && is_scalar($c[$k])) {
                $fillPhone((string) $c[$k]);
            }
        }
        if (!empty($c['id']) && is_scalar($c['id']) && ($m['phone'] ?? '') === '' && ($m['phone_number'] ?? '') === '') {
            $raw = (string) $c['id'];
            if (preg_match('/^(\d{8,20})@s\.whatsapp\.net$/i', $raw, $mm)) {
                $m['phone_number'] = $mm[1];
            } else {
                $fillPhone($raw);
            }
        }
        if (isset($c['jid']) && is_scalar($c['jid']) && ($m['jid'] ?? '') === '') {
            $m['jid'] = (string) $c['jid'];
        }
        if (isset($c['full_name']) && is_scalar($c['full_name']) && ($m['full_name'] ?? '') === '') {
            $m['full_name'] = (string) $c['full_name'];
        }

        return $m;
    }

    /**
     * @param array<string, mixed> $params Corpo de `params` de uma notificação `receive_message` (JSON-RPC).
     */
    public static function fromReceiveMessageParams(array $params): string
    {
        return self::fromContactOrConversation(self::mergeNestedContactForLookup($params));
    }

    /**
     * @param array<string, mixed> $params Corpo de `params` de `receive_message` — para bater com a lista lateral.
     *
     * @return list<string>
     */
    public static function aliasKeysForReceiveMessageParams(array $params): array
    {
        return self::aliasKeysForRow(self::mergeNestedContactForLookup($params));
    }

    /**
     * Garante JID "5511...@s.whatsapp.net" quando a UI/query envia só o número
     * (a SaaS e o push WS usam o JID).
     */
    public static function toWhatsAppJidIfBareNumber(string $conversationId): string
    {
        $t = trim($conversationId);
        if ($t === '') {
            return '';
        }
        if (str_contains($t, '@')) {
            return $t;
        }
        $digits = preg_replace('/\D/', '', $t) ?? '';
        if (strlen($digits) >= 8 && strlen($digits) <= 20) {
            return $digits . '@s.whatsapp.net';
        }

        return $t;
    }

    /**
     * Converte o envelope JSON-RPC do WS ou o corpo "igual à API" num payload para POST /api/v1/chat/send.
     *
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>|null Novo corpo, ou null se não for notificação receive_message.
     */
    public static function chatSendBodyFromReceiveMessageRpc(array $body): ?array
    {
        if (($body['method'] ?? '') !== 'receive_message' || !isset($body['params']) || !is_array($body['params'])) {
            return null;
        }
        $p = $body['params'];
        $cid = self::fromReceiveMessageParams($p);
        if ($cid === '') {
            return null;
        }
        $conv = self::toWhatsAppJidIfBareNumber($cid);
        $out = [
            'conversation_id' => $conv,
            'content' => isset($p['content']) && (is_string($p['content']) || is_numeric($p['content'])) ? (string) $p['content'] : '',
        ];
        $skip = [
            'conversation_id', 'content', 'message_id', 'from_me', 'side', 'type', 'timestamp',
            'contact', 'contact_phone', 'params', 'method', 'id', 'jsonrpc',
        ];
        foreach ($p as $k => $v) {
            if (in_array($k, $skip, true) || !is_string($k)) {
                continue;
            }
            if (!array_key_exists($k, $out)) {
                $out[$k] = $v;
            }
        }

        return $out;
    }

    /**
     * @param list<string> $keys
     *
     * @return list<string>
     */
    private static function withWhatsappJidAliases(array $keys): array
    {
        $out = $keys;
        foreach ($keys as $k) {
            if (preg_match('/^(\d{8,20})@s\.whatsapp\.net$/i', $k, $m)) {
                $out[] = $m[1];
            }
        }

        $extra = $out;
        foreach ($out as $k) {
            if (preg_match('/^(\d{8,20})$/', $k)) {
                $extra[] = $k . '@s.whatsapp.net';
            }
        }

        $normalized = [];
        foreach ($extra as $v) {
            $s = trim((string) $v);
            if ($s !== '') {
                $normalized[] = $s;
            }
        }

        return array_values(array_unique($normalized));
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromContactOrConversation(array $row): string
    {
        $row = self::mergeNestedContactForLookup($row);
        $phone = (string) ($row['phone'] ?? $row['phone_number'] ?? $row['number'] ?? $row['wa_id'] ?? $row['jid'] ?? '');

        $nested = $row['conversation'] ?? null;
        $nestedArr = is_array($nested) ? $nested : null;

        $candidates = [
            $row['conversation_id'] ?? null,
            $row['conversationId'] ?? null,
            $row['active_conversation_id'] ?? null,
            $row['chat_id'] ?? null,
            $row['thread_id'] ?? null,
            $nestedArr !== null ? ($nestedArr['id'] ?? null) : null,
            $nestedArr !== null ? ($nestedArr['conversation_id'] ?? null) : null,
            $phone !== '' ? $phone : null,
        ];

        foreach ($candidates as $v) {
            if ($v !== null && $v !== '') {
                return (string) $v;
            }
        }

        return '';
    }

    /**
     * Todos os identificadores conhecidos do contacto/conversa para cruzar com pushes WS
     * (ex.: API manda conversation_id "19" no socket mas a lista usava só o telefone).
     *
     * @param array<string, mixed> $row
     * @return list<string>
     */
    public static function aliasKeysForRow(array $row): array
    {
        $row = self::mergeNestedContactForLookup($row);
        $keys = [];
        $main = self::fromContactOrConversation($row);
        if ($main !== '') {
            $keys[] = $main;
        }
        foreach (['conversation_id', 'conversationId', 'active_conversation_id', 'chat_id', 'thread_id', 'contact_phone'] as $k) {
            if (!empty($row[$k]) && is_scalar($row[$k])) {
                $keys[] = (string) $row[$k];
            }
        }
        $nested = $row['conversation'] ?? null;
        if (is_array($nested)) {
            foreach (['id', 'conversation_id', 'conversationId'] as $k) {
                if (!empty($nested[$k]) && is_scalar($nested[$k])) {
                    $keys[] = (string) $nested[$k];
                }
            }
        }
        $c = $row['contact'] ?? null;
        if (is_array($c)) {
            foreach (['id', 'phone_number', 'phone', 'wa_id', 'jid'] as $k) {
                if (!empty($c[$k]) && is_scalar($c[$k])) {
                    $keys[] = (string) $c[$k];
                }
            }
        }
        $phone = (string) ($row['phone'] ?? $row['phone_number'] ?? $row['number'] ?? $row['wa_id'] ?? '');
        if ($phone !== '') {
            $keys[] = $phone;
            $digits = preg_replace('/\D/', '', $phone);
            if ($digits !== '' && $digits !== $phone) {
                $keys[] = $digits;
            }
        }
        $normalized = [];
        foreach ($keys as $v) {
            $s = trim((string) $v);
            if ($s !== '') {
                $normalized[] = $s;
            }
        }
        $normalized = array_values(array_unique($normalized));

        return self::withWhatsappJidAliases($normalized);
    }
}
