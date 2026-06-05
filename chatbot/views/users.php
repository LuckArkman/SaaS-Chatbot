<?php
/** @var string $base */
$base = $base ?? '';
$pageTitle = "Usuários e Operadores";
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> — SaaS Chatbot</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?php echo htmlspecialchars(rtrim($base, '/') . '/css/sidebar-expand.css'); ?>">
    <link rel="stylesheet" href="<?php echo htmlspecialchars(rtrim($base, '/') . '/css/dash-media.css'); ?>">
    <style>
        :root {
            --bg-app: #0f172a;
            --bg-sidebar: #1e293b;
            --bg-card: rgba(30, 41, 59, 0.4);
            --primary: #4f46e5;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
            --active-item: rgba(79, 70, 229, 0.15);
            --active-item-border: #4f46e5;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background-color: var(--bg-app);
            color: var(--text-main);
            height: 100vh;
            display: flex;
            overflow: hidden;
        }
        .app-container { display: flex; width: 100%; height: 100%; }
        .sidebar {
            width: 70px; background: var(--bg-sidebar); border-right: 1px solid var(--border);
            display: flex; flex-direction: column; align-items: center; padding: 1.5rem 0;
            transition: width 0.25s ease; position: relative; flex-shrink: 0; z-index: 100;
        }
        .sidebar--expanded { width: 240px; align-items: flex-start; padding: 1.5rem 1.25rem; }
        .sidebar-brand { margin-bottom: 2.5rem; font-size: 1.2rem; font-weight: 700; color: #818cf8; white-space: nowrap; overflow: hidden; width: 100%; text-align: center; }
        .sidebar--expanded .sidebar-brand { text-align: left; padding-left: 0.5rem; }
        .sidebar-nav { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; flex: 1; }
        .sidebar-nav a {
            display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;
            border-radius: 12px; color: var(--text-muted); text-decoration: none; transition: all 0.2s; position: relative; margin: 0 auto;
        }
        .sidebar--expanded .sidebar-nav a { justify-content: flex-start; width: 100%; padding: 0 0.85rem; gap: 0.75rem; margin: 0; }
        .sidebar-nav a:hover, .sidebar-nav a.active { color: var(--text-main); background: var(--active-item); border-left: 3px solid var(--active-item-border); }
        .sidebar-nav-label { display: none; font-size: 0.9rem; font-weight: 500; }
        .sidebar--expanded .sidebar-nav-label { display: block; }
        .sidebar-toggle { background: none; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; margin-top: auto; }
        .sidebar-toggle:hover { background: var(--active-item); color: var(--text-main); }
        
        .main-content {
            flex: 1; padding: 2.5rem; display: flex; flex-direction: column; gap: 1.5rem; overflow-y: auto;
            background: radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%);
        }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
        .header h1 { font-size: 1.6rem; font-weight: 700; color: var(--text-main); }
        .card {
            background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border); border-radius: 20px; padding: 2rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            line-height: 1.6;
        }
        .card p { color: var(--text-muted); margin-bottom: 1rem; }
        .btn {
            display: inline-block; padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
            color: #fff; background: var(--primary); border: none; text-decoration: none; cursor: pointer; transition: background 0.2s;
        }
        .btn:hover { background: #4338ca; }
    </style>
</head>
<body data-dash-api-log-fullpage="0">

<div class="app-container">
    <aside class="sidebar" id="appSidebar">
        <div class="sidebar-brand">UTalk</div>
        <nav class="sidebar-nav">
            <a href="<?php echo htmlspecialchars($base); ?>/home" title="Conversas">
                <span style="font-size: 1.2rem;">💬</span><span class="sidebar-nav-label">Conversas</span>
            </a>
            <a href="<?php echo htmlspecialchars($base); ?>/contatos" title="Contatos">
                <span style="font-size: 1.2rem;">👥</span><span class="sidebar-nav-label">Contatos</span>
            </a>
            <a href="<?php echo htmlspecialchars($base); ?>/board" title="Fluxos">
                <span style="font-size: 1.2rem;">📊</span><span class="sidebar-nav-label">Fluxos</span>
            </a>
            <a href="<?php echo htmlspecialchars($base); ?>/agentes-ia" title="Agente WhatsApp">
                <span style="font-size: 1.2rem;">🤖</span><span class="sidebar-nav-label">Agente WhatsApp</span>
            </a>
            <a href="<?php echo htmlspecialchars($base); ?>/chatbots" title="Chatbot AI">
                <span style="font-size: 1.2rem;">🧠</span><span class="sidebar-nav-label">Chatbot AI</span>
            </a>
            <a href="<?php echo htmlspecialchars($base); ?>/configuracoes" title="Configurações">
                <span style="font-size: 1.2rem;">⚙️</span><span class="sidebar-nav-label">Configurações</span>
            </a>
            <a href="<?php echo htmlspecialchars($base); ?>/testes-api" title="Testes API">
                <span style="font-size: 1.2rem;">🧪</span><span class="sidebar-nav-label">Testes API</span>
            </a>
            <a href="<?php echo htmlspecialchars($base); ?>/logout" title="Sair" style="margin-top: auto;">
                <span style="font-size: 1.2rem;">🚪</span><span class="sidebar-nav-label">Sair</span>
            </a>
        </nav>
        <button class="sidebar-toggle" id="sidebarToggle" aria-expanded="false" title="Expandir menu">☰</button>
    </aside>

    <main class="main-content">
        <header class="header">
            <h1><?php echo htmlspecialchars($pageTitle); ?></h1>
            <div style="font-size: 0.8rem; background: rgba(129, 140, 248, 0.15); color: #818cf8; padding: 0.25rem 0.5rem; border-radius: 8px; font-weight: 500;">
                Ambiente Local
            </div>
        </header>

        <div class="card">
            <p>Esta tela faz parte do painel operacional do SaaS Chatbot.</p>
            <p>O módulo de <strong><?php echo htmlspecialchars($pageTitle); ?></strong> está integrado ao backend Node.js.</p>
            <p style="margin-bottom: 1.5rem;">Utilize o painel de conversas ou a consola flutuante para rodar validações e testes.</p>
            <a href="<?php echo htmlspecialchars($base); ?>/home" class="btn">Voltar para Conversas</a>
        </div>
    </main>
</div>

<script src="<?php echo htmlspecialchars(rtrim($base, '/') . '/js/dash-api-call-log.js'); ?>"></script>
<script src="<?php echo htmlspecialchars(rtrim($base, '/') . '/js/sidebar-expand.js'); ?>"></script>
</body>
</html>
