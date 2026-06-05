<?php

declare(strict_types=1);

namespace App\Controller;

use App\Bootstrap;

final class BillingController
{
    public function index(): void
    {
        $apiBase = Bootstrap::env('API_BASE_URL', '');
        $openapiDocsUrl = $apiBase !== '' ? rtrim($apiBase, '/\\') . '/docs' : '';
        require dirname(__DIR__, 2) . '/views/billing.php';
    }
}
