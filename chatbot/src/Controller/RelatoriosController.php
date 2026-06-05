<?php

declare(strict_types=1);

namespace App\Controller;

class RelatoriosController
{
    public function index(): void
    {
        require dirname(__DIR__, 2) . '/views/relatorios.php';
    }
}
