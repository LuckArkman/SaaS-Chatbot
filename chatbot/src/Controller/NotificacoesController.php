<?php

declare(strict_types=1);

namespace App\Controller;

class NotificacoesController
{
    public function index(): void
    {
        require dirname(__DIR__, 2) . '/views/notificacoes.php';
    }
}
