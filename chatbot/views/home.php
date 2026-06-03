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

            <div class="contacts-list" id="contactsList">
                <?php if ($error !== null): ?>
                    <div style="font-size: 0.8rem; color: #fca5a5; padding: 1rem;"><?= htmlspecialchars($error) ?></div>
                <?php endif; ?>
                
                <?php if (empty($contacts)): ?>
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 2rem;">Nenhum contato encontrado.</div>
                <?php else: ?>
                    <?php foreach ($contacts as $contact): ?>
                        <?php 
                            $convId = $contact['_utalk_conversation_id'] ?? '';
                            $name = $contact['name'] ?? $contact['full_name'] ?? 'Contato sem nome';
                            $phone = $contact['phone'] ?? $contact['phone_number'] ?? '';
                            $initial = mb_substr($name, 0, 1);
                        ?>
                        <div class="contact-item" data-conversation-id="<?= htmlspecialchars($convId) ?>" onclick="selectConversation('<?= htmlspecialchars($convId) ?>', '<?= htmlspecialchars($name) ?>')">
                            <div class="contact-avatar"><?= htmlspecialchars($initial) ?></div>
                            <div class="contact-info">
                                <div class="contact-name"><?= htmlspecialchars($name) ?></div>
                                <div class="contact-phone"><?= htmlspecialchars($phone) ?></div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
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
        messagesBox.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:2rem;font-size:0.85rem;">Carregando histórico...</div>';

        fetch(url)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (cid !== currentConversationId) return; // evitou race conditions
                messagesBox.innerHTML = '';
                var list = Array.isArray(data) ? data : (data.items || []);
                
                if (list.length === 0) {
                    messagesBox.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:2rem;font-size:0.85rem;">Nenhuma mensagem nesta conversa.</div>';
                    return;
                }

                list.forEach(function(msg) {
                    var bubble = document.createElement('div');
                    var fromMe = msg.from_me || msg.fromMe || false;
                    bubble.className = 'message-bubble ' + (fromMe ? 'outgoing' : 'incoming');
                    
                    // Armazena JSON bruto no elemento para que o dash-chat-bind.js / dash-whatsapp-media.js o re-renderize se for mídia
                    bubble.setAttribute('data-message-json', JSON.stringify(msg));
                    
                    var text = msg.content || msg.text || msg.body || '';
                    bubble.textContent = text;

                    // Adicionar hora da mensagem se disponível
                    var timeStr = '';
                    var ts = msg.timestamp || msg.createdAt;
                    if (ts) {
                        try {
                            var d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
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
                
                // Força o dash-chat-bind a re-analisar mídias no DOM recém-carregado
                if (window.DashWhatsAppMedia && typeof window.enhanceHistoryMessages === 'function') {
                    window.enhanceHistoryMessages(messagesBox);
                }
            })
            .catch(function(err) {
                if (cid !== currentConversationId) return;
                messagesBox.innerHTML = '<div style="color:#fca5a5;text-align:center;padding:2rem;font-size:0.85rem;">Erro ao carregar histórico: ' + err.message + '</div>';
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: cid,
                content: text
            })
        })
        .then(function(r) { return r.json(); })
        .then(function() {
            if (cid === currentConversationId) {
                loadHistory();
            }
        })
        .catch(function(err) {
            alert('Erro ao enviar mensagem: ' + err.message);
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
</script>
</body>
</html>
