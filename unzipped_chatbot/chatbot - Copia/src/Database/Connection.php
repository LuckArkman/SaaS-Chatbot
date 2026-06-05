<?php

declare(strict_types=1);

namespace App\Database;

use PDO;
use PDOException;

class Connection
{
    private static ?PDO $instance = null;

    public static function get(): PDO
    {
        if (self::$instance === null) {
            $host = \App\Bootstrap::env('DB_HOST', 'localhost');
            $port = \App\Bootstrap::env('DB_PORT', '3306');
            $dbname = \App\Bootstrap::env('DB_NAME', 'chatbot_db');
            $user = \App\Bootstrap::env('DB_USER', 'root');
            $pass = \App\Bootstrap::env('DB_PASS', '');
            $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];
            self::$instance = new PDO($dsn, $user, $pass, $options);
        }
        return self::$instance;
    }
}
