<?php
/** @var string $base */
/** @var string $error */
/** @var array $old */
/** @var array $api_debug */
$base = $base ?? '';
$error = $error ?? '';
$old = $old ?? [];
$api_debug = $api_debug ?? [];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registro — SaaS Chatbot</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            --card-bg: rgba(30, 41, 59, 0.7);
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
            --error-bg: rgba(239, 68, 68, 0.15);
            --error-border: rgba(239, 68, 68, 0.3);
            --error-text: #fca5a5;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background: var(--bg-gradient);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }

        .register-container {
            width: 100%;
            max-width: 480px;
            perspective: 1000px;
        }

        .register-card {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 2.5rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .logo {
            font-size: 1.75rem;
            font-weight: 700;
            background: linear-gradient(to right, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }

        .subtitle {
            font-size: 0.9rem;
            color: var(--text-muted);
        }

        .alert {
            background: var(--error-bg);
            border: 1px solid var(--error-border);
            color: var(--error-text);
            padding: 0.85rem 1rem;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-bottom: 1.5rem;
            line-height: 1.4;
        }

        .form-group {
            margin-bottom: 1.25rem;
        }

        label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        input {
            width: 100%;
            padding: 0.85rem 1rem;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text-main);
            font-family: inherit;
            font-size: 0.95rem;
            transition: all 0.2s ease;
        }

        input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
            background: rgba(15, 23, 42, 0.8);
        }

        .btn-submit {
            width: 100%;
            padding: 0.9rem;
            background: var(--primary);
            color: #fff;
            border: none;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 0.5rem;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .btn-submit:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .footer-links {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .footer-links a {
            color: #818cf8;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }

        .footer-links a:hover {
            color: #a5b4fc;
            text-decoration: underline;
        }

        /* Debug Section */
        .debug-box {
            margin-top: 2rem;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 16px;
            padding: 1.25rem;
            font-family: ui-monospace, monospace;
            font-size: 0.75rem;
            color: #f1f5f9;
        }

        .debug-title {
            color: #fca5a5;
            font-weight: 700;
            margin-bottom: 0.75rem;
            display: flex;
            justify-content: space-between;
        }

        .debug-pre {
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 200px;
            overflow-y: auto;
            background: #090d16;
            padding: 0.75rem;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
    </style>
</head>
<body>

<div class="register-container">
    <div class="register-card">
        <div class="header">
            <div class="logo">Registrar Tenant</div>
            <div class="subtitle">Crie seu espaço na plataforma SaaS</div>
        </div>

        <?php if ($error !== ''): ?>
            <div class="alert" role="alert">
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form action="<?= htmlspecialchars($base) ?>/register" method="POST">
            <div class="form-group">
                <label for="name">Seu Nome Completo</label>
                <input type="text" id="name" name="name" value="<?= htmlspecialchars($old['name'] ?? '') ?>" placeholder="João Silva" required>
            </div>

            <div class="form-group">
                <label for="email">E-mail</label>
                <input type="email" id="email" name="email" value="<?= htmlspecialchars($old['email'] ?? '') ?>" placeholder="exemplo@empresa.com" required>
            </div>

            <div class="form-group">
                <label for="tenantName">Nome da Empresa (Tenant)</label>
                <input type="text" id="tenantName" name="tenantName" value="<?= htmlspecialchars($old['tenantName'] ?? '') ?>" placeholder="Minha Empresa Ltda" required>
            </div>

            <div class="form-group">
                <label for="password">Senha</label>
                <input type="password" id="password" name="password" placeholder="Mínimo 8 caracteres, 1 maiúscula" required>
            </div>

            <button type="submit" class="btn-submit">Criar Conta</button>
        </form>

        <div class="footer-links">
            Já possui cadastro? <a href="<?= htmlspecialchars($base) ?>/login">Fazer Login</a>
        </div>

        <?php if (!empty($api_debug)): ?>
            <div class="debug-box">
                <div class="debug-title">
                    <span>CONSOLA API DEBUG</span>
                    <span style="color: #64748b;">HTTP <?= htmlspecialchars((string) ($api_debug['responseCode'] ?? '')) ?></span>
                </div>
                <div style="margin-bottom: 0.5rem;">
                    <strong><?= htmlspecialchars($api_debug['requestMethod'] ?? '') ?></strong> <?= htmlspecialchars($api_debug['requestUrl'] ?? '') ?>
                </div>
                <pre class="debug-pre"><?= htmlspecialchars(json_encode($api_debug['responseBody'] ?? $api_debug['responseRaw'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) ?></pre>
            </div>
        <?php endif; ?>
    </div>
</div>

</body>
</html>
