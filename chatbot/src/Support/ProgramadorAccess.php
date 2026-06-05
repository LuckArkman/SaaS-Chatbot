<?php

declare(strict_types=1);

namespace App\Support;

use App\Bootstrap;

/**
 * Utilizador "programador": consola de API (/programador/api, testes-api, dev/call restrito).
 *
 * - `programador@teste.com` (default) e `PROGRAMADOR_EMAILS`: só consola (redirecionados fora do painel operacional).
 * - `PROGRAMADOR_FULL_ACCESS_EMAILS`: consola + painel completo (home, contatos, etc.) para testar como utilizador normal.
 */
final class ProgramadorAccess
{
    private const DEFAULT_EMAIL = 'programador@teste.com';

    private static function normalizedSessionEmail(): string
    {
        return strtolower(trim((string) ($_SESSION['omni_user_email'] ?? '')));
    }

    /** Verifica se o e-mail está numa lista separada por vírgulas (comparação case-insensitive). */
    private static function emailInList(string $email, string $commaList): bool
    {
        if ($email === '' || trim($commaList) === '') {
            return false;
        }
        foreach (array_map('trim', explode(',', $commaList)) as $allowed) {
            if ($allowed !== '' && strtolower($allowed) === $email) {
                return true;
            }
        }

        return false;
    }

    /** Tem perfil programador (consola + rotas exclusivas). */
    public static function isProgramador(): bool
    {
        $email = self::normalizedSessionEmail();
        if ($email === '') {
            return false;
        }
        if ($email === strtolower(self::DEFAULT_EMAIL)) {
            return true;
        }
        if (self::emailInList($email, Bootstrap::env('PROGRAMADOR_EMAILS', ''))) {
            return true;
        }
        if (self::emailInList($email, Bootstrap::env('PROGRAMADOR_FULL_ACCESS_EMAILS', ''))) {
            return true;
        }

        return false;
    }

    /**
     * Se true, o utilizador programador não deve usar o painel operacional: login e rotas $requireAppUser mandam-no para a consola.
     * Quem está só em PROGRAMADOR_FULL_ACCESS_EMAILS fica false (usa home, contatos, etc.).
     */
    public static function shouldRedirectProgramadorFromOperationalApp(): bool
    {
        if (!self::isProgramador()) {
            return false;
        }
        $email = self::normalizedSessionEmail();
        if (self::emailInList($email, Bootstrap::env('PROGRAMADOR_FULL_ACCESS_EMAILS', ''))) {
            return false;
        }

        return true;
    }

    /** Responde 403 JSON e encerra. */
    public static function requireProgramadorJson(): void
    {
        if (self::isProgramador()) {
            return;
        }
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(403);
        echo json_encode(['error' => 'Acesso exclusivo do utilizador programador.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
