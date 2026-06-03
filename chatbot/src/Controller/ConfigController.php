<?php

declare(strict_types=1);

namespace App\Controller;

class ConfigController
{
    public function index(): void
    {
        require dirname(__DIR__, 2) . '/views/configuracoes.php';
    }

    /** Página dedicada ao registo de chamadas /api/omni (sessionStorage + mesmo script que o painel flutuante). */
    public function registroApi(): void
    {
        require dirname(__DIR__, 2) . '/views/registro-api.php';
    }
}
