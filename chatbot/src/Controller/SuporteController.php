<?php

declare(strict_types=1);

namespace App\Controller;

class SuporteController
{
    public function index(): void
    {
        require dirname(__DIR__, 2) . '/views/suporte.php';
    }
}
