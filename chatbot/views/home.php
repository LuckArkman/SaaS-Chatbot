<?php
/** @var string $base */
/** @var array $contacts */
/** @var array $user */
/** @var string|null $error */
$base = $base ?? '';
$contacts = $contacts ?? [];
$user = $user ?? [];
$error = $error ?? null;
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Conversas — SaaS Chatbot</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= htmlspecialchars(rtrim($base, '/') . '/css/dash-media.css') ?>">
    <link rel="stylesheet" href="<?= htmlspecialchars(rtrim($base, '/') . '/css/sidebar-expand.css') ?>">
    <style>
        :root {
            --bg-app: #0f172a;
            --bg-sidebar: #1e293b;
            --bg-card: rgba(30, 41, 59, 0.4);
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
            --active-item: rgba(79, 70, 229, 0.15);
            --active-item-border: #4f46e5;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background-color: var(--bg-app);
            color: var(--text-main);
            height: 100vh;
            display: flex;
            overflow: hidden;
        }

        /* Layout Grid Principal */
        .app-container {
            display: flex;
            width: 100%;
            height: 100%;
        }

        /* Sidebar Customizada baseada no sidebar-expand */
        .sidebar {
            width: 70px;
            background: var(--bg-sidebar);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1.5rem 0;
            transition: width 0.25s ease;
            position: relative;
            flex-shrink: 0;
            z-index: 100;
        }
        
        .sidebar--expanded {
            width: 240px;
            align-items: flex-start;
            padding: 1.5rem 1.25rem;
        }

        .sidebar-brand {
            margin-bottom: 2.5rem;
            font-size: 1.2rem;
            font-weight: 700;
            color: #818cf8;
            white-space: nowrap;
            overflow: hidden;
            width: 100%;
            text-align: center;
        }
        .sidebar--expanded .sidebar-brand {
            text-align: left;
            padding-left: 0.5rem;
        }

        .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            width: 100%;
            flex: 1;
        }

        .sidebar-nav a {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 12px;
            color: var(--text-muted);
            text-decoration: none;
            transition: all 0.2s;
            position: relative;
            margin: 0 auto;
        }

        .sidebar--expanded .sidebar-nav a {
            justify-content: flex-start;
            width: 100%;
            padding: 0 0.85rem;
            gap: 0.75rem;
            margin: 0;
        }

        .sidebar-nav a:hover, .sidebar-nav a.active {
            color: var(--text-main);
            background: var(--active-item);
            border-left: 3px solid var(--active-item-border);
        }

        .sidebar-nav-label {
            display: none;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .sidebar--expanded .sidebar-nav-label {
            display: block;
        }

        .sidebar-toggle {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.2rem;
            cursor: pointer;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            margin-top: auto;
        }
        .sidebar-toggle:hover {
            background: var(--active-item);
            color: var(--text-main);
        }

        /* Area Principal de Conteudo */
        .main-content {
            display: flex;
            flex: 1;
            height: 100%;
            overflow: hidden;
        }

        /* Coluna de Contatos */
        .contacts-column {
            width: 320px;
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            background: rgba(15, 23, 42, 0.4);
            flex-shrink: 0;
        }

        .contacts-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border);
        }

        .contacts-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .user-badge {
            font-size: 0.75rem;
            background: rgba(129, 140, 248, 0.15);
            color: #818cf8;
            padding: 0.25rem 0.5rem;
            border-radius: 8px;
            font-weight: 500;
        }

        .search-box {
            position: relative;
        }

        .search-box input {
            width: 100%;
            padding: 0.65rem 1rem;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text-main);
            font-size: 0.85rem;
        }

        .search-box input:focus {
            outline: none;
            border-color: var(--primary);
        }

        .contacts-list {
            flex: 1;
            overflow-y: auto;
            padding: 0.75rem;
        }

        .contact-item {
            display: flex;
            align-items: center;
            padding: 0.85rem 1rem;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 0.35rem;
            border: 1px solid transparent;
        }

        .contact-item:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        .contact-item.active {
            background: var(--active-item);
            border-color: rgba(79, 70, 229, 0.25);
        }

        .contact-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #4f46e5;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-right: 0.85rem;
            flex-shrink: 0;
            background-size: cover;
            background-position: center;
        }

        .contact-info {
            flex: 1;
            min-width: 0;
        }

        .contact-name {
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 0.15rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .contact-phone {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        /* Coluna de Chat */
        .chat-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(15, 23, 42, 0.25);
            position: relative;
        }

        /* Tela de Placeholder quando nenhum contato está selecionado */
        .chat-welcome {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
            color: var(--text-muted);
        }

        .chat-welcome-icon {
            font-size: 4rem;
            color: #4f46e5;
            margin-bottom: 1.5rem;
            opacity: 0.7;
        }

        .chat-welcome h2 {
            color: var(--text-main);
            font-size: 1.35rem;
            margin-bottom: 0.5rem;
        }

        /* Cabeçalho do Chat Ativo */
        .chat-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(30, 41, 59, 0.2);
            backdrop-filter: blur(8px);
        }

        .active-contact-title {
            font-size: 0.95rem;
            font-weight: 600;
        }

        .active-contact-status {
            font-size: 0.75rem;
            color: #22c55e;
            display: flex;
            align-items: center;
            gap: 0.35rem;
            margin-top: 0.15rem;
        }

        /* Histórico de Mensagens */
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background: radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%);
        }

        .message-bubble {
            max-width: 60%;
            padding: 0.85rem 1rem;
            border-radius: 16px;
            font-size: 0.9rem;
            line-height: 1.45;
            word-wrap: break-word;
            position: relative;
        }

        .message-bubble.incoming {
            background: #1e293b;
            color: var(--text-main);
            align-self: flex-start;
            border-bottom-left-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .message-bubble.outgoing {
            background: #4f46e5;
            color: #fff;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }

        .message-time {
            font-size: 0.68rem;
            color: rgba(255, 255, 255, 0.5);
            text-align: right;
            margin-top: 0.35rem;
        }
        
        .incoming .message-time {
            color: var(--text-muted);
        }

        /* Compositor de Mensagem (Composer) */
        .chat-composer-container {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border);
            background: rgba(30, 41, 59, 0.25);
        }

        .chat-composer {
            display: flex;
            align-items: center;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 0.5rem 0.85rem;
            gap: 0.5rem;
        }

        .chat-composer input[type="text"] {
            flex: 1;
            background: none;
            border: none;
            color: var(--text-main);
            padding: 0.5rem 0.25rem;
            font-family: inherit;
            font-size: 0.92rem;
        }

        .chat-composer input[type="text"]:focus {
            outline: none;
        }

        .composer-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.4rem;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .composer-btn:hover {
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.05);
        }

        .composer-btn-send {
            background: var(--primary);
            color: #fff;
            padding: 0.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);
        }

        .composer-btn-send:hover {
            background: var(--primary-hover);
            color: #fff;
        }
        
        .chat-welcome-btn-group {
            margin-top: 1.5rem;
            display: flex;
            gap: 0.75rem;
        }
        
        .chat-welcome-btn-group a {
            display: inline-block;
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            border: 1px solid var(--border);
            background: rgba(255,255,255,0.02);
            transition: all 0.2s;
        }
        
        .chat-welcome-btn-group a:hover {
            color: var(--text-main);
            background: var(--active-item);
            border-color: var(--active-item-border);
        }
    </style>
</head>
<body data-dash-api-log-fullpage="0">

<!-- activeConversationId para acoplamento do dash-chat-bind.js -->
<input type="hidden" id="activeConversationId" value="">

<div class="app-container">
    <!-- Menu lateral / Sidebar -->
    <aside class="sidebar" id="appSidebar" aria-label="Menu Lateral">
        <div class="sidebar-brand">UTalk</div>
        <nav class="sidebar-nav">
            <a href="<?= htmlspecialchars($base) ?>/home" class="active" title="Conversas">
                <span style="font-size: 1.2rem;">💬</span>
                <span class="sidebar-nav-label">Conversas</span>
            </a>
            <a href="<?= htmlspecialchars($base) ?>/contatos" title="Contatos">
                <span style="font-size: 1.2rem;">👥</span>
                <span class="sidebar-nav-label">Contatos</span>
            </a>
            <a href="<?= htmlspecialchars($base) ?>/board" title="Fluxos">
                <span style="font-size: 1.2rem;">📊</span>
                <span class="sidebar-nav-label">Fluxos</span>
            </a>
            <a href="<?= htmlspecialchars($base) ?>/agentes-ia" title="Agente WhatsApp">
                <span style="font-size: 1.2rem;">🤖</span>
                <span class="sidebar-nav-label">Agente WhatsApp</span>
            </a>
            <a href="<?= htmlspecialchars($base) ?>/chatbots" title="Chatbot AI">
                <span style="font-size: 1.2rem;">🧠</span><span class="sidebar-nav-label">Chatbot AI</span>
            </a>
            <a href="<?= htmlspecialchars($base) ?>/configuracoes" title="Configurações">
                <span style="font-size: 1.2rem;">⚙️</span>
                <span class="sidebar-nav-label">Configurações</span>
            </a>
            <a href="<?= htmlspecialchars($base) ?>/testes-api" title="Testes API">
                <span style="font-size: 1.2rem;">🧪</span>
                <span class="sidebar-nav-label">Testes API</span>
            </a>
            <a href="<?= htmlspecialchars($base) ?>/logout" title="Sair" style="margin-top: auto;">
                <span style="font-size: 1.2rem;">🚪</span>
                <span class="sidebar-nav-label">Sair</span>
            </a>
        </nav>
        <button class="sidebar-toggle" id="sidebarToggle" aria-expanded="false" title="Expandir menu">☰</button>
    </aside>

    <div class="main-content">
        <!-- Coluna de Contatos -->
        <section class="contacts-column" aria-label="Lista de Contatos">
            <div class="contacts-header">
                <div class="contacts-title">
                    <span>Conversas</span>
                    <?php if (!empty($user['email'])): ?>
                        <span class="user-badge" title="<?= htmlspecialchars($user['email']) ?>"><?= htmlspecialchars($user['name'] ?? 'Usuário') ?></span>
                    <?php endif; ?>
                </div>
                <div class="search-box">
                    <input type="text" id="contactSearch" placeholder="Pesquisar contatos...">
                </div>
            </div>

            <div class="contacts-tabs" style="display: flex; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem;">
                <button class="tab-btn active" data-tab="contacts" style="flex: 1; background: none; border: none; color: var(--text-main); padding: 0.75rem; cursor: pointer; border-bottom: 2px solid var(--primary); font-weight: 600;">Contatos</button>
                <button class="tab-btn" data-tab="groups" style="flex: 1; background: none; border: none; color: var(--text-muted); padding: 0.75rem; cursor: pointer; border-bottom: 2px solid transparent; font-weight: 600;">Grupos</button>
            </div>

            <div class="contacts-list" id="contactsList">
                <?php if ($error !== null): ?>
                    <div style="font-size: 0.8rem; color: #fca5a5; padding: 1rem;"><?= htmlspecialchars($error) ?></div>
                <?php endif; ?>
                
                <?php if (empty($contacts)): ?>
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 2rem;">Nenhuma conversa encontrada.</div>
                <?php else: ?>
                    <?php foreach ($contacts as $contact): ?>
                        <?php 
                            $convId = $contact['_utalk_conversation_id'] ?? '';
                            $name = $contact['contact_name'] ?? $contact['name'] ?? $contact['full_name'] ?? 'Desconhecido';
                            $phone = $contact['contact_phone'] ?? $contact['phone'] ?? $contact['phone_number'] ?? '';
                            $isGroup = $contact['is_group'] ?? (strlen($phone) > 15);
                            $profilePic = $contact['profile_pic_url'] ?? null;
                            $initial = mb_substr($name, 0, 1);
                            
                            if ($isGroup && !str_contains($convId, '@')) {
                                $convId = $phone . '@g.us';
                            }
                        ?>
                        <div class="contact-item" data-conversation-id="<?= htmlspecialchars($convId) ?>" data-is-group="<?= $isGroup ? 'true' : 'false' ?>" onclick="selectConversation('<?= htmlspecialchars($convId) ?>', '<?= htmlspecialchars($name) ?>')" style="display: <?= $isGroup ? 'none' : 'flex' ?>;">
                            <?php if ($profilePic): ?>
                                <div class="contact-avatar" style="background-image: url('<?= htmlspecialchars($profilePic) ?>'); color: transparent; border: 1px solid rgba(255,255,255,0.1);"></div>
                            <?php else: ?>
                                <div class="contact-avatar"><?= htmlspecialchars($initial) ?></div>
                            <?php endif; ?>
                            <div class="contact-info">
                                <div class="contact-name"><?= htmlspecialchars($name) ?></div>
                                <div class="contact-phone"><?= htmlspecialchars($phone) ?></div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
            <script>
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.tab-btn').forEach(b => {
                            b.classList.remove('active');
                            b.style.color = 'var(--text-muted)';
                            b.style.borderBottom = '2px solid transparent';
                        });
                        this.classList.add('active');
                        this.style.color = 'var(--text-main)';
                        this.style.borderBottom = '2px solid var(--primary)';
                        
                        const tab = this.getAttribute('data-tab');
                        const isGroupTarget = tab === 'groups' ? 'true' : 'false';
                        
                        document.querySelectorAll('.contact-item').forEach(item => {
                            if (item.getAttribute('data-is-group') === isGroupTarget) {
                                item.style.display = 'flex';
                            } else {
                                item.style.display = 'none';
                            }
                        });
                    });
                });
            </script>
        </section>

        <!-- Coluna de Chat -->
        <section class="chat-column" aria-label="Janela de Mensagens">
            <!-- Tela de Welcome quando vazio -->
            <div class="chat-welcome" id="chatWelcome">
                <div class="chat-welcome-icon">💬</div>
                <h2>Bem-vindo ao UTalk</h2>
                <p>Selecione um contato na lista lateral para iniciar a conversa.</p>
                <div class="chat-welcome-btn-group">
                    <a href="<?= htmlspecialchars($base) ?>/testes-api">Ciclo do Bot & WebSockets</a>
                    <a href="<?= htmlspecialchars($base) ?>/testes-media">Testar Mídias WhatsApp</a>
                </div>
            </div>

            <!-- Janela de Chat Ativa -->
            <div id="chatActiveWindow" style="display: none; flex-direction: column; height: 100%; width: 100%;">
                <div class="chat-header">
                    <div>
                        <div class="active-contact-title" id="activeContactName">Nome do Contato</div>
                        <div class="active-contact-status">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;"></span>
                            <span>Online</span>
                        </div>
                    </div>
                </div>

                <!-- Container de mensagens (data-utalk-chat-messages para binding do MutationObserver) -->
                <div class="chat-messages" id="chatMessages" data-utalk-chat-messages>
                    <!-- Preenchido via AJAX/fetch -->
                </div>

                <!-- Compositor com data-utalk-chat-composer e inputs necessários -->
                <div class="chat-composer-container" data-utalk-chat-composer>
                    <form id="chatForm" onsubmit="handleSendSubmit(event)">
                        <div class="chat-composer">
                            <!-- Inputs de Mídia exigidos por dash-whatsapp-media.js -->
                            <input type="file" id="utalkChatFile" style="display:none;" data-utalk-chat-file>
                            <button type="button" id="utalkChatAttach" class="composer-btn" data-utalk-chat-attach title="Anexar mídia">📎</button>
                            
                            <input type="text" id="chatMessageInput" data-utalk-chat-input placeholder="Digite sua mensagem...">
                            
                            <button type="submit" class="composer-btn composer-btn-send" title="Enviar mensagem">➤</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    </div>
</div>

<script>window.API_BASE = <?= json_encode(rtrim($base, '/')) ?>;</script>
<script src="<?= htmlspecialchars(rtrim($base, '/')) ?>/js/dash-whatsapp-media.js"></script>
<script src="<?= htmlspecialchars(rtrim($base, '/')) ?>/js/dash-chat-bind.js"></script>
<script src="<?= htmlspecialchars(rtrim($base, '/')) ?>/js/dash-api-call-log.js"></script>
<script src="<?= htmlspecialchars(rtrim($base, '/')) ?>/js/sidebar-expand.js"></script>

<script>
    function utalkShowToast(msg, type) {
        var toast = document.createElement('div');
        var bg = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:' + bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:0.9rem;box-shadow:0 4px 20px rgba(0,0,0,0.4);max-width:340px;word-wrap:break-word;animation:utalk-toast-in 0.3s ease;';
        if (!document.getElementById('_utalk_toast_style')) {
            var s = document.createElement('style');
            s.id = '_utalk_toast_style';
            s.textContent = '@keyframes utalk-toast-in{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}';
            document.head.appendChild(s);
        }
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 5000);
    }

        var currentConversationId = '';

    function selectConversation(convId, name) {
        currentConversationId = convId;
        window.UTALK_ACTIVE_CONVERSATION_ID = convId;
        document.getElementById('activeConversationId').value = convId;

        // Visualizar janela do chat
        document.getElementById('chatWelcome').style.display = 'none';
        document.getElementById('chatActiveWindow').style.display = 'flex';
        document.getElementById('activeContactName').textContent = name;

        // Destacar na barra lateral de contatos
        document.querySelectorAll('.contact-item').forEach(function(item) {
            item.classList.remove('active');
            if (item.getAttribute('data-conversation-id') === convId) {
                item.classList.add('active');
            }
        });

        loadHistory();
    }

    function loadHistory() {
        var cid = currentConversationId;
        if (!cid) return;
        var url = (window.API_BASE || '') + '/api/omni/chat/history?conversation_id=' + encodeURIComponent(cid);
        var messagesBox = document.getElementById('chatMessages');

        if (!document.getElementById('_utalk_spin_style')) {
            var st = document.createElement('style');
            st.id = '_utalk_spin_style';
            st.textContent = '@keyframes utalk-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}';
            document.head.appendChild(st);
        }
        messagesBox.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:3rem 2rem;font-size:0.88rem;">'
            + '<div style="font-size:2rem;margin-bottom:0.8rem;animation:utalk-spin 1.2s linear infinite;display:inline-block;">&#8635;</div><br>'
            + '<strong>Sincronizando com WhatsApp...</strong><br>'
            + '<span style="font-size:0.78rem;opacity:0.65;">Buscando hist&oacute;rico de mensagens</span>'
            + '</div>';

        fetch(url, { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (cid !== currentConversationId) return;
                messagesBox.innerHTML = '';
                var list = Array.isArray(data) ? data : (data.items || data.data || data.messages || []);

                if (list.length === 0) {
                    messagesBox.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:2rem;font-size:0.85rem;">Nenhuma mensagem nesta conversa.<br><span style="font-size:0.75rem;opacity:0.6;">Envie a primeira mensagem abaixo.</span></div>';
                    return;
                }

                list.forEach(function(msg) {
                    var bubble = document.createElement('div');
                    var fromMe = msg.from_me || msg.fromMe || false;
                    bubble.className = 'message-bubble ' + (fromMe ? 'outgoing' : 'incoming');
                    bubble.setAttribute('data-message-json', JSON.stringify(msg));

                    var msgType = (msg.type || msg.message_type || '').toLowerCase();
                    var mediaUrl = msg.media_url || msg.mediaUrl || '';

                    if (msgType === 'sticker' && mediaUrl) {
                        var stickerImg = document.createElement('img');
                        stickerImg.src = mediaUrl;
                        stickerImg.style.cssText = 'max-width:160px;max-height:160px;border-radius:4px;display:block;';
                        stickerImg.alt = 'Figurinha';
                        bubble.style.background = 'transparent';
                        bubble.style.boxShadow = 'none';
                        bubble.style.padding = '0';
                        bubble.appendChild(stickerImg);
                    } else if (msgType === 'image' && mediaUrl) {
                        var img = document.createElement('img');
                        img.src = mediaUrl;
                        img.style.cssText = 'max-width:260px;max-height:300px;border-radius:8px;display:block;cursor:pointer;';
                        img.alt = msg.content || 'Imagem';
                        img.onclick = function() { window.open(mediaUrl, '_blank'); };
                        bubble.appendChild(img);
                        if (msg.content) {
                            var cap = document.createElement('div');
                            cap.style.cssText = 'font-size:0.82rem;margin-top:4px;opacity:0.85;';
                            cap.textContent = msg.content;
                            bubble.appendChild(cap);
                        }
                    } else if ((msgType === 'audio' || msgType === 'ptt') && mediaUrl) {
                        var audio = document.createElement('audio');
                        audio.controls = true;
                        audio.src = mediaUrl;
                        audio.style.cssText = 'max-width:240px;display:block;';
                        bubble.appendChild(audio);
                    } else if (msgType === 'video' && mediaUrl) {
                        var video = document.createElement('video');
                        video.controls = true;
                        video.src = mediaUrl;
                        video.style.cssText = 'max-width:280px;max-height:220px;border-radius:8px;display:block;';
                        bubble.appendChild(video);
                    } else if (msgType === 'document' && mediaUrl) {
                        var docLink = document.createElement('a');
                        docLink.href = mediaUrl;
                        docLink.target = '_blank';
                        docLink.style.cssText = 'display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;padding:4px 0;';
                        docLink.innerHTML = '&#128206; <span>' + (msg.content || 'Documento') + '</span>';
                        bubble.appendChild(docLink);
                    } else {
                        var text = msg.content || msg.text || msg.body || '';
                        bubble.textContent = text || '[Midia]';
                    }

                    var timeStr = '';
                    var ts = msg.created_at || msg.timestamp || msg.createdAt;
                    if (ts) {
                        try {
                            var d;
                            if (typeof ts === 'number') {
                                d = new Date(ts < 1e12 ? ts * 1000 : ts);
                            } else {
                                d = new Date(ts);
                            }
                            timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        } catch(e) {}
                    }
                    if (timeStr) {
                        var timeSpan = document.createElement('div');
                        timeSpan.className = 'message-time';
                        timeSpan.textContent = timeStr;
                        bubble.appendChild(timeSpan);
                    }

                    messagesBox.appendChild(bubble);
                });

                messagesBox.scrollTop = messagesBox.scrollHeight;

                if (window.DashWhatsAppMedia && typeof window.enhanceHistoryMessages === 'function') {
                    window.enhanceHistoryMessages(messagesBox);
                }
            })
            .catch(function(err) {
                if (cid !== currentConversationId) return;
                messagesBox.innerHTML = '<div style="color:#fca5a5;text-align:center;padding:2rem;font-size:0.85rem;">Erro ao carregar hist&oacute;rico: ' + err.message + '</div>';
            });
    }

    function handleSendSubmit(e) {
        e.preventDefault();
        var cid = currentConversationId;
        var input = document.getElementById('chatMessageInput');
        var text = input.value.trim();
        if (!cid || !text) return;

        input.value = '';
        var url = (window.API_BASE || '') + '/api/omni/chat/send';

        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: cid,
                content: text
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (cid === currentConversationId) {
                loadHistory();
            }
        })
        .catch(function(err) {
            console.error('Erro ao enviar mensagem:', err);
            utalkShowToast('Erro ao enviar mensagem: ' + err.message, 'error');
        });
    }

    // Vincula a recarga de histórico após upload concluído com sucesso
    window.UTALK_RELOAD_CHAT_HISTORY = loadHistory;

    // Filtro simples de pesquisa de contatos
    document.getElementById('contactSearch').addEventListener('input', function(e) {
        var query = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.contact-item').forEach(function(item) {
            var name = item.querySelector('.contact-name').textContent.toLowerCase();
            var phone = item.querySelector('.contact-phone').textContent.toLowerCase();
            if (name.indexOf(query) !== -1 || phone.indexOf(query) !== -1) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    var contactAvatars = {};

    function loadContacts() {
        var url = (window.API_BASE || '') + '/api/omni/contacts/whatsapp';
        fetch(url, { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                // Suporte a múltiplos formatos: { contacts: [...] }, { data: [...] }, [...]
                var list = Array.isArray(res) ? res : (res.contacts || res.data || res.items || []);
                var listContainer = document.getElementById('contactsList');
                if (list.length === 0) {
                    listContainer.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 2rem;">Nenhuma conversa encontrada.</div>';
                    return;
                }
                var html = '';
                list.forEach(function(contact) {
                    var name = contact.contact_name || contact.name || contact.notify || contact.pushname || contact.full_name || 'Desconhecido';
                    var phone = contact.contact_phone || contact.phone_number || contact.phone || (contact.id ? contact.id.split('@')[0] : '');
                    var isGroup = contact.is_group || (contact.id && contact.id.includes('@g.us')) || phone.length > 15;
                    var profilePic = contact.profile_pic_url || contactAvatars[phone] || '';
                    var convId = phone;
                    if (isGroup && convId.indexOf('@') === -1) {
                        convId = phone + '@g.us';
                    }
                    var initial = name.charAt(0).toUpperCase();
                    var activeClass = (convId === currentConversationId) ? ' active' : '';
                    
                    var avatarUrl = profilePic;
                    var avatarStyle = avatarUrl ? ' style="background-image: url(\'' + avatarUrl + '\'); color: transparent; border: 1px solid rgba(255,255,255,0.1);"' : '';
                    var avatarContent = avatarUrl ? '' : initial;
                    
                    var activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
                    var shouldDisplay = (activeTab === 'groups' && isGroup) || (activeTab === 'contacts' && !isGroup) ? 'flex' : 'none';
                    
                    html += '<div class="contact-item' + activeClass + '" data-conversation-id="' + convId + '" data-is-group="' + (isGroup ? 'true' : 'false') + '" onclick="selectConversation(\'' + convId + '\', \'' + name.replace(/'/g, "\\'") + '\')" style="display: ' + shouldDisplay + ';">';
                    html += '    <div class="contact-avatar"' + avatarStyle + '>' + avatarContent + '</div>';
                    html += '    <div class="contact-info">';
                    html += '        <div class="contact-name">' + name + '</div>';
                    html += '        <div class="contact-phone">' + phone + '</div>';
                    html += '    </div>';
                    html += '</div>';
                });
                listContainer.innerHTML = html;
            })
            .catch(function(err) {
                console.error('Erro ao recarregar contatos via AJAX:', err);
            });
    }

    function connectWebSocket() {
        var configUrl = (window.API_BASE || '') + '/api/omni/auth/ws-config';
        fetch(configUrl)
            .then(function(r) { return r.json(); })
            .then(function(config) {
                if (!config.enabled || !config.ws_url) {
                    console.warn('WebSocket desabilitado ou sem URL configurada:', config.reason);
                    return;
                }
                
                console.log('Iniciando conexão WebSocket...');
                var ws = new WebSocket(config.ws_url);
                
                ws.onopen = function() {
                    console.log('WebSocket conectado com sucesso.');
                };
                
                ws.onmessage = function(event) {
                    try {
                        var payload = JSON.parse(event.data);
                        if (payload.method === 'new_message' || payload.method === 'receive_message') {
                            var params = payload.params || {};
                            var phone = params.contact_phone || params.phone || params.conversation_id;
                            
                            // Salva o avatar no cache em memória se retornado
                            if (phone && params.contact_avatar) {
                                contactAvatars[phone] = params.contact_avatar;
                            }
                            
                            // Se a mensagem for da conversa ativa, recarrega o histórico (com debounce para não travar o navegador)
                            if (phone && phone === currentConversationId) {
                                clearTimeout(window._wsHistoryTimeout);
                                window._wsHistoryTimeout = setTimeout(function() {
                                    loadHistory();
                                }, 500);
                            }
                            
                            // Atualiza a lista de contatos para refletir o status/novos contatos (com debounce)
                            clearTimeout(window._wsContactsTimeout);
                            window._wsContactsTimeout = setTimeout(function() {
                                loadContacts();
                            }, 500);
                        }
                    } catch (e) {
                        console.error('Erro ao processar mensagem do WebSocket:', e);
                    }
                };
                
                ws.onclose = function() {
                    console.log('WebSocket desconectado. Tentando reconectar em 5 segundos...');
                    setTimeout(connectWebSocket, 5000);
                };
                
                ws.onerror = function(err) {
                    console.error('Erro no WebSocket:', err);
                };
            })
            .catch(function(err) {
                console.error('Erro ao buscar configuração do WebSocket:', err);
            });
    }
    
    // Inicializa o WebSocket
    connectWebSocket();
</script>
</body>
</html>
