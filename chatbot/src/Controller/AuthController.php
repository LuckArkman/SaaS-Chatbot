<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\OmniChannelApiClient;
use App\Service\ApiException;
use App\Support\ProgramadorAccess;
use App\Support\PublicBasePath;

class AuthController
{
    /** Retorna o caminho base da aplicação para redirects e links (ex: /chatbotEdmilson/public). */
    private static function getBasePath(): string
    {
        return PublicBasePath::fromRequest();
    }

    public function showLogin(): void
    {
        $error = '';
        $old = [];
        $this->renderLogin($error, $old);
    }

    public function showRegister(): void
    {
        $error = '';
        $old = [];
        $this->renderRegister($error, $old);
    }

    public function register(): void
    {
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $tenantName = trim($_POST['tenantName'] ?? $name ?: 'Minha Empresa');
        $password = $_POST['password'] ?? '';

        $errors = [];
        if ($name === '') {
            $errors[] = 'Nome completo é obrigatório.';
        }
        if ($email === '') {
            $errors[] = 'E-mail é obrigatório.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'E-mail inválido.';
        }
        if (strlen($password) < 8) {
            $errors[] = 'A senha deve ter no mínimo 8 caracteres.';
        } elseif (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'A senha deve conter pelo menos uma letra maiúscula.';
        }

        if (!empty($errors)) {
            $this->renderRegister(implode(' ', $errors), [
                'name' => $name,
                'email' => $email,
                'tenantName' => $tenantName,
            ]);
            return;
        }

        try {
            $api = new OmniChannelApiClient();
            $api->authRegister($email, $password, $name, $tenantName);
            $base = self::getBasePath();
            header('Location: ' . ($base ? $base . '/' : '') . 'login');
            exit;
        } catch (ApiException $e) {
            $msg = $e->getMessage();
            if ($e->getStatusCode() === 422) {
                $msg = 'Dados inválidos. Verifique os campos.';
            }
            $this->renderRegister($msg, [
                'name' => $name,
                'email' => $email,
                'tenantName' => $tenantName,
            ], self::apiDebugFromException($e));
        } catch (\Throwable $e) {
            $this->renderRegister('Erro ao conectar com o servidor. Tente novamente.', [
                'name' => $name,
                'email' => $email,
                'tenantName' => $tenantName,
            ]);
        }
    }

    public function login(): void
    {
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($email) || empty($password)) {
            $this->renderLogin('Preencha e-mail e senha.', ['email' => $email]);
            return;
        }

        try {
            $api = new OmniChannelApiClient();
            $data = $api->authLogin($email, $password);
            $token = $data['token'] ?? $data['accessToken'] ?? $data['access_token'] ?? null;
            if ($token) {
                $_SESSION['omni_token'] = $token;
                $_SESSION['omni_user_email'] = strtolower($email);
                if (isset($data['tenantId'])) {
                    $_SESSION['omni_tenant_id'] = (string) $data['tenantId'];
                } elseif (isset($data['tenant_id'])) {
                    $_SESSION['omni_tenant_id'] = (string) $data['tenant_id'];
                }
                $base = self::getBasePath();
                $dest = ProgramadorAccess::shouldRedirectProgramadorFromOperationalApp() ? 'programador/api' : 'home';
                header('Location: ' . ($base ? $base . '/' : '') . $dest);
                exit;
            }
        } catch (ApiException $e) {
            $apiDebug = self::apiDebugFromException($e);
            if ($e->getStatusCode() === 401) {
                $this->renderLogin('E-mail ou senha incorretos.', ['email' => $email], $apiDebug);
                return;
            }
            $this->renderLogin($e->getMessage(), ['email' => $email], $apiDebug);
            return;
        } catch (\Throwable $e) {
            $this->renderLogin('Erro ao conectar com o servidor. Tente novamente.', ['email' => $email]);
            return;
        }

        $this->renderLogin('Resposta inválida do servidor. Tente novamente.', ['email' => $email]);
    }

    public function logout(): void
    {
        $_SESSION['omni_token'] = null;
        $_SESSION['omni_tenant_id'] = null;
        $_SESSION['omni_user_email'] = null;
        unset($_SESSION['omni_token'], $_SESSION['omni_tenant_id'], $_SESSION['omni_user_email']);
        $base = self::getBasePath();
        header('Location: ' . ($base ? $base . '/' : '') . 'login');
        exit;
    }

    private static function apiDebugFromException(ApiException $e): array
    {
        $raw = $e->getResponseRaw();
        if (strlen($raw) > 2000) {
            $raw = substr($raw, 0, 2000) . "\n... (truncado)";
        }
        return [
            'requestUrl' => $e->getRequestUrl(),
            'requestMethod' => $e->getRequestMethod(),
            'requestBody' => $e->getRequestBody(),
            'responseCode' => $e->getStatusCode(),
            'responseBody' => $e->getResponse(),
            'responseRaw' => $raw,
        ];
    }

    private function renderLogin(string $error = '', array $old = [], array $apiDebug = []): void
    {
        $base = self::getBasePath();
        $login_debug = (($_GET['debug'] ?? '') === '1' || ($_POST['debug'] ?? '') === '1');
        extract([
            'error' => $error,
            'old' => $old,
            'base' => $base,
            'api_debug' => $apiDebug,
            'login_debug' => $login_debug,
        ]);
        require dirname(__DIR__, 2) . '/views/login.php';
    }

    private function renderRegister(string $error = '', array $old = [], array $apiDebug = []): void
    {
        $base = self::getBasePath();
        extract([
            'error' => $error,
            'old' => $old,
            'base' => $base,
            'api_debug' => $apiDebug,
        ]);
        require dirname(__DIR__, 2) . '/views/register.php';
    }
}
