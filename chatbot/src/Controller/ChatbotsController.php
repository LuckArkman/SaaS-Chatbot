<?php

declare(strict_types=1);

namespace App\Controller;

class ChatbotsController
{
    public function index(): void
    {
        require dirname(__DIR__, 2) . '/views/chatbots.php';
    }
}
