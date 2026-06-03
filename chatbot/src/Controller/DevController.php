<?php

declare(strict_types=1);

namespace App\Controller;

use App\Bootstrap;
use App\Service\OmniChannelApiClient;
use App\Service\ApiException;
use App\Support\ProgramadorAccess;
use App\Support\PublicBasePath;
use App\Support\SaaSEndpointHints;

/**
 * Rotas de desenvolvimento: criar usuário programador de teste e tela de testes de API.
 */
class DevController
{
    private const TEST_EMAIL = 'programador@teste.com';
    private const TEST_PASSWORD = 'Senha123!';
    private const TEST_NAME = 'Programador Teste';
    private const TEST_TENANT = 'Tenant Teste';

    /** Cria usuário programador na API (GET para facilitar – abrir link ou botão). */
    public function createProgramadorUser(): void
    {
        try {
            $api = new OmniChannelApiClient(null);
            $api->authRegister(self::TEST_EMAIL, self::TEST_PASSWORD, self::TEST_NAME, self::TEST_TENANT);
            $this->renderCreated();
        } catch (ApiException $e) {
            $msg = $e->getMessage();
            if ($e->getStatusCode() === 422 || strpos($msg, 'already') !== false || strpos($msg, 'exist') !== false) {
                $this->renderCreated(true);
                return;
            }
            $this->renderError($msg);
        } catch (\Throwable $e) {
            $this->renderError($e->getMessage());
        }
    }

    private function renderCreated(bool $alreadyExists = false): void
    {
        $base = PublicBasePath::fromRequest();
        $loginUrl = $base . '/login';
        $consoleUrl = $base . '/programador/api';
        $testesUrl = $base . '/testes-api';
        $msg = $alreadyExists
            ? 'Usuário programador já existe. Use os dados abaixo para login.'
            : 'Usuário programador criado com sucesso.';
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Usuário de teste</title>';
        echo '<style>body{font-family:system-ui;max-width:500px;margin:3rem auto;padding:1.5rem;} .box{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:1.25rem;margin:1rem 0;} .box.err{background:#fef2f2;border-color:#fca5a5;} code{background:#e5e7eb;padding:0.2em 0.4em;border-radius:4px;} a{color:#2563eb;} .btn{display:inline-block;margin-top:0.5rem;margin-right:0.5rem;padding:0.5rem 1rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;} .btn:hover{background:#1d4ed8;}</style></head><body>';
        echo '<h1>Usuário programador</h1><div class="box"><p>' . htmlspecialchars($msg) . '</p>';
        echo '<p><strong>E-mail:</strong> <code>' . htmlspecialchars(self::TEST_EMAIL) . '</code></p>';
        echo '<p><strong>Senha:</strong> <code>' . htmlspecialchars(self::TEST_PASSWORD) . '</code></p>';
        echo '<p><a href="' . htmlspecialchars($loginUrl) . '" class="btn">Fazer login</a> ';
        echo '<a href="' . htmlspecialchars($consoleUrl) . '" class="btn">Consola programador</a> ';
        $mediaUrl = $base . '/testes-media';
        echo '<a href="' . htmlspecialchars($testesUrl) . '" class="btn">Testes ciclo API</a> ';
        echo '<a href="' . htmlspecialchars($mediaUrl) . '" class="btn">Testes mídia</a></p></div></body></html>';
    }

    private function renderError(string $message): void
    {
        header('Content-Type: text/html; charset=utf-8');
        http_response_code(400);
        echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro</title>';
        echo '<style>body{font-family:system-ui;max-width:500px;margin:3rem auto;padding:1.5rem;} .box{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:1.25rem;}</style></head><body>';
        echo '<h1>Erro ao criar usuário</h1><div class="box"><p>' . htmlspecialchars($message) . '</p></div></body></html>';
    }

    /** Tela de testes de API (requer login). */
    public function testesApi(): void
    {
        $base = PublicBasePath::fromRequest();
        $hints = SaaSEndpointHints::fromApiBaseUrl(Bootstrap::env('API_BASE_URL', ''));
        $saasApiBaseUrl = $hints['api_base'];
        $saasWsRpcUriTemplate = $hints['ws_rpc_uri_template'];
        $saasWsPythonExample = $hints['python_example_cmd'];
        require dirname(__DIR__, 2) . '/views/testes-api.php';
    }

    /** Consola do programador: catálogo OpenAPI + chamadas à SaaS (acesso exclusivo). */
    public function programadorApi(): void
    {
        $base = PublicBasePath::fromRequest();
        $programadorCanOpenOperationalApp = !ProgramadorAccess::shouldRedirectProgramadorFromOperationalApp();
        $apiBase = Bootstrap::env('API_BASE_URL', '');
        $saasSwaggerUrl = $apiBase !== '' ? rtrim($apiBase, '/\\') . '/docs' : '';
        $hints = SaaSEndpointHints::fromApiBaseUrl($apiBase);
        $saasApiBaseUrl = $hints['api_base'];
        $saasWsRpcUriTemplate = $hints['ws_rpc_uri_template'];
        $saasWsPythonExample = $hints['python_example_cmd'];
        require dirname(__DIR__, 2) . '/views/programador-api.php';
    }

    /** Página simples para ligar ao WebSocket JSON-RPC da SaaS no browser (programador). */
    public function programadorWsTest(): void
    {
        $base = PublicBasePath::fromRequest();
        $programadorCanOpenOperationalApp = !ProgramadorAccess::shouldRedirectProgramadorFromOperationalApp();
        $apiBase = Bootstrap::env('API_BASE_URL', '');
        $saasSwaggerUrl = $apiBase !== '' ? rtrim($apiBase, '/\\') . '/docs' : '';
        $hints = SaaSEndpointHints::fromApiBaseUrl($apiBase);
        $saasApiBaseUrl = $hints['api_base'];
        $saasWsRpcUriTemplate = $hints['ws_rpc_uri_template'];
        require dirname(__DIR__, 2) . '/views/programador-ws-test.php';
    }

    /** Referência rápida: parâmetros de URL de debug já suportados no painel Conversas. */
    public function programadorDebug(): void
    {
        $base = PublicBasePath::fromRequest();
        $programadorCanOpenOperationalApp = !ProgramadorAccess::shouldRedirectProgramadorFromOperationalApp();
        require dirname(__DIR__, 2) . '/views/programador-debug.php';
    }

    /**
     * Testes de mídia WhatsApp no browser (equivalente aos test_*.js na raiz).
     * Acesso: programador ou utilizador operacional com sessão.
     */
    public function testesMedia(): void
    {
        $base = PublicBasePath::fromRequest();
        require dirname(__DIR__, 2) . '/views/testes-media.php';
    }

}
