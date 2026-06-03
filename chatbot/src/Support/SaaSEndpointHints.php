<?php

declare(strict_types=1);

namespace App\Support;

/**
 * URLs de exemplo para a consola programador e mensagens dev/call (WebSocket RPC).
 * O WebSocket usa o mesmo host/porta que API_BASE_URL (http→ws, https→wss).
 */
final class SaaSEndpointHints
{
    /**
     * @return array{api_base: string, ws_rpc_uri_template: string, python_example_cmd: string}
     */
    public static function fromApiBaseUrl(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return [
                'api_base' => '',
                'ws_rpc_uri_template' => '',
                'python_example_cmd' => '',
            ];
        }

        $base = rtrim($raw, '/\\');
        $parts = parse_url($base);
        if ($parts === false || empty($parts['host'])) {
            return [
                'api_base' => $base,
                'ws_rpc_uri_template' => '',
                'python_example_cmd' => '',
            ];
        }

        $https = ($parts['scheme'] ?? 'http') === 'https';
        $wsScheme = $https ? 'wss' : 'ws';
        $host = $parts['host'];
        $portPart = '';
        if (!empty($parts['port'])) {
            $portPart = ':' . (int) $parts['port'];
        }
        $wsUri = $wsScheme . '://' . $host . $portPart . '/api/v1/ws?token=JWT';

        $pyPort = !empty($parts['port']) ? (int) $parts['port'] : ($https ? 443 : 80);
        $pyFlag = $https ? ' --wss' : '';
        $pythonCmd = sprintf(
            'python scripts/test_rpc_ws.py --host %s --port %d%s --token "JWT" --conversation-id TELEFONE_OU_CONV --listen',
            $host,
            $pyPort,
            $pyFlag
        );

        return [
            'api_base' => $base,
            'ws_rpc_uri_template' => $wsUri,
            'python_example_cmd' => $pythonCmd,
        ];
    }
}
