<?php

declare(strict_types=1);

namespace App\Controller;

class AgentesController
{
    public function index(): void
    {
        require dirname(__DIR__, 2) . '/views/agentes-ia.php';
    }
}
