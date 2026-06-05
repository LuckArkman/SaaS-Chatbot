<?php

declare(strict_types=1);

namespace App\Service;

use App\Bootstrap;

class ApiClient
{
    private string $baseUrl;
    private int $timeout;

    public function __construct(?string $baseUrl = null, int $timeout = 10)
    {
        $this->baseUrl = rtrim($baseUrl ?? Bootstrap::env('API_BASE_URL', 'https://jsonplaceholder.typicode.com'), '/');
        $this->timeout = (int) Bootstrap::env('API_TIMEOUT', (string) $timeout);
    }

    public function get(string $path): array
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \RuntimeException("Erro ao conectar na API: $error");
        }

        if ($httpCode >= 400) {
            throw new \RuntimeException("API retornou HTTP $httpCode");
        }

        $data = json_decode((string) $response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Resposta da API inválida');
        }

        return $data ?? [];
    }
}
