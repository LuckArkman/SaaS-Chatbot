<?php

declare(strict_types=1);

namespace App\Controller;

use App\Model\User;

class UserController
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    public function index(): void
    {
        $users = $this->userModel->all();
        $this->render('users/index', ['users' => $users]);
    }

    public function show(): void
    {
        $id = (int) ($_GET['id'] ?? 0);
        $base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
        if ($id <= 0) {
            header('Location: ' . $base . '/users');
            exit;
        }
        $user = $this->userModel->find($id);
        if (!$user) {
            header('Location: ' . $base . '/users');
            exit;
        }
        $this->render('users/show', ['user' => $user]);
    }

    public function store(): void
    {
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');

        $errors = [];
        if ($name === '') {
            $errors[] = 'Nome é obrigatório.';
        }
        if ($email === '') {
            $errors[] = 'E-mail é obrigatório.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'E-mail inválido.';
        }

        if (!empty($errors)) {
            $users = $this->userModel->all();
            $this->render('users/index', [
                'users' => $users,
                'errors' => $errors,
                'old' => ['name' => $name, 'email' => $email],
            ]);
            return;
        }

        try {
            $this->userModel->create(['name' => $name, 'email' => $email]);
            $base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
            header('Location: ' . $base . '/users');
            exit;
        } catch (\PDOException $e) {
            $users = $this->userModel->all();
            $errors = ['Erro ao salvar. E-mail pode já estar em uso.'];
            $this->render('users/index', [
                'users' => $users,
                'errors' => $errors,
                'old' => ['name' => $name, 'email' => $email],
            ]);
        }
    }

    private function render(string $view, array $data = []): void
    {
        $data['view'] = $view;
        $data['title'] = $data['title'] ?? 'Usuários';
        extract($data);
        require dirname(__DIR__, 2) . '/views/layout.php';
    }
}
