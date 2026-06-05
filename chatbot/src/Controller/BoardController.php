<?php

declare(strict_types=1);

namespace App\Controller;

class BoardController
{
    public function index(): void
    {
        require dirname(__DIR__, 2) . '/views/board.php';
    }
}
