<?php

declare(strict_types=1);

namespace App;

class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): self
    {
        $this->routes['GET'][$path] = $handler;
        return $this;
    }

    public function post(string $path, callable $handler): self
    {
        $this->routes['POST'][$path] = $handler;
        return $this;
    }

    public function put(string $path, callable $handler): self
    {
        $this->routes['PUT'][$path] = $handler;
        return $this;
    }

    public function patch(string $path, callable $handler): self
    {
        $this->routes['PATCH'][$path] = $handler;
        return $this;
    }

    public function delete(string $path, callable $handler): self
    {
        $this->routes['DELETE'][$path] = $handler;
        return $this;
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // Preferir o caminho passado pelo .htaccess (?url=) para não depender de REQUEST_URI no servidor
        if (array_key_exists('url', $_GET)) {
            $path = trim((string) $_GET['url'], '/');
            $uri = $path === '' ? '/' : '/' . $path;
        } else {
            $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
            $uri = rtrim($uri, '/') ?: '/';
            $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
            if ($scriptDir !== '/' && $scriptDir !== '\\' && str_starts_with($uri, $scriptDir)) {
                $uri = substr($uri, strlen($scriptDir)) ?: '/';
            } else {
                $parentDir = dirname($scriptDir);
                if ($parentDir !== '/' && $parentDir !== '\\' && $parentDir !== '.' && str_starts_with($uri, $parentDir)) {
                    $uri = substr($uri, strlen($parentDir)) ?: '/';
                }
            }
        }

        $uri = $uri ?: '/';

        $routes = $this->routes[$method] ?? [];
        if (isset($routes[$uri])) {
            $handler = $routes[$uri];
            $handler();
            return;
        }

        http_response_code(404);
        echo '<h1>404 - Página não encontrada</h1>';
    }
}
