<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Normaliza respostas da API (contacts/, contacts/whatsapp, etc.) para lista de objetos-contacto.
 */
final class ContactListPayload
{
    private const LIST_KEYS = [
        'items',
        'data',
        'contacts',
        'results',
        'records',
        'rows',
        'list',
        'chats',
        'conversations',
    ];

    /**
     * @param array<string, mixed> $data
     * @return list<array<string, mixed>>
     */
    public static function extractRows(array $data): array
    {
        if ($data === []) {
            return [];
        }
        foreach (self::LIST_KEYS as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                return self::onlyArrayElements($data[$key]);
            }
        }
        $keys = array_keys($data);
        if ($keys !== [] && $keys === range(0, count($data) - 1)) {
            return self::onlyArrayElements($data);
        }

        return [];
    }

    /**
     * @param array<int|string, mixed> $list
     * @return list<array<string, mixed>>
     */
    private static function onlyArrayElements(array $list): array
    {
        $out = [];
        foreach ($list as $row) {
            if (is_array($row)) {
                $out[] = $row;
            }
        }

        return $out;
    }
}
