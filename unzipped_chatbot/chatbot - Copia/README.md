# Chatbot Edmilson - PHP 8 MVC

## Requisitos

- PHP 8+
- Composer
- MySQL

## Instalação

```bash
composer install
```

## Banco de dados

1. Crie o banco de dados:

```sql
CREATE DATABASE chatbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Execute o schema:

```bash
mysql -u root -p chatbot_db < database/schema.sql
```

## Configuração

1. Copie o arquivo de exemplo e edite conforme necessário:

```bash
copy .env.example .env
```

2. Configure as variáveis no `.env`:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` - conexão MySQL
   - `API_BASE_URL` - URL base da API (default: https://jsonplaceholder.typicode.com)
   - `API_TIMEOUT` - timeout em segundos para requisições à API

## Executar o servidor

```bash
php -S localhost:8000 -t public public/router.php
```

Acesse: http://localhost:8000

## Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | / | Home |
| GET | /users | Lista usuários |
| GET | /users/show?id= | Exibe usuário por ID |
| POST | /users/store | Cria usuário |
| GET | /api/posts | Posts da API externa (10 primeiros) |
