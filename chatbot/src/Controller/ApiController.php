<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\ApiClient;

class ApiController
{
    public function posts(): void
    {
        $posts = [];
        $error = null;

        try {
            $client = new ApiClient();
            $data = $client->get('/posts');
            $posts = is_array($data) ? array_slice($data, 0, 10) : [];
        } catch (\Throwable $e) {
            $error = 'Não foi possível carregar os posts. Tente novamente mais tarde.';
        }

        $this->render('api/posts', ['posts' => $posts, 'error' => $error]);
    }

    private function render(string $view, array $data = []): void
    {
        $data['view'] = $view;
        $data['title'] = $data['title'] ?? 'Posts API';
        extract($data);
        require dirname(__DIR__, 2) . '/views/layout.php';
    }
}
