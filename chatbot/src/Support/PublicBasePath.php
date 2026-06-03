<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Caminho URL até à pasta public (ex.: /chatbotEdmilson/public) para links, redirects e window.API_BASE.
 *
 * dirname(REQUEST_URI) em rotas como …/public/programador/home produz …/public/programador e quebra
 * fetch para …/api/omni (o proxy fica em …/public/api/omni). Usamos SCRIPT_NAME e o último segmento /public/.
 */
final class PublicBasePath
{
    public static function fromRequest(): string
    {
        $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
        if ($script === '' || $script === '/') {
            return '';
        }
        $pos = strrpos($script, '/public/');
        if ($pos !== false) {
            return substr($script, 0, $pos + strlen('/public'));
        }
        $dir = dirname($script);
        $dir = rtrim($dir, '/');

        return $dir === '/' || $dir === '.' ? '' : $dir;
    }
}
