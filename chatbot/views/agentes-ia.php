<?php
/** @var string $base */
$base = $base ?? '';
$pageTitle = "Agente WhatsApp";
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
            --primary-hover: #4338ca;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
            --active-item: rgba(79, 70, 229, 0.15);
            --active-item-border: #4f46e5;
            
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #3b82f6;
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
        }
        
        /* Grid das informações do agente */
        .agent-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-top: 1rem;
        }
        @media(max-width: 768px) {
            .agent-grid { grid-template-columns: 1fr; }
        }

        /* Status Header */
        .status-container {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.25rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            border-radius: 16px;
            margin-bottom: 1.5rem;
        }
        .status-indicator {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            position: relative;
        }
        .status-indicator::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        /* Cores dos status com pulsação */
        .status-CONNECTED .status-indicator { background-color: var(--success); }
        .status-CONNECTED .status-indicator::after { background-color: var(--success); }
        
        .status-CONNECTING .status-indicator { background-color: var(--warning); }
        .status-CONNECTING .status-indicator::after { background-color: var(--warning); }
        
        .status-QRCODE .status-indicator { background-color: var(--info); }
        .status-QRCODE .status-indicator::after { background-color: var(--info); }
        
        .status-DISCONNECTED .status-indicator { background-color: var(--danger); }
        .status-DISCONNECTED .status-indicator::after { background-color: var(--danger); }
        
        .status-text {
            font-size: 1.1rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Informações da Instância */
        .info-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 0.85rem 1rem;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
        }
        .info-label { color: var(--text-muted); font-size: 0.9rem; }
        .info-value { font-weight: 600; font-size: 0.9rem; }

        /* Botões */
        .btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 1.5rem;
        }
        .btn {
            padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;
            color: #fff; border: none; cursor: pointer; transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-primary { background: var(--primary); }
        .btn-primary:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border); }
        .btn-secondary:hover:not(:disabled) { background: rgba(255, 255, 255, 0.15); }
        
        .btn-danger { background: var(--danger); }
        .btn-danger:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); }

        /* Card do QR Code */
        .qr-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            border-radius: 20px;
            background: rgba(15, 23, 42, 0.5);
            border: 1px dashed rgba(255, 255, 255, 0.15);
            min-height: 350px;
            text-align: center;
            position: relative;
        }
        
        .qr-wrapper {
            background: #fff;
            padding: 1.25rem;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.4s ease-out;
        }
        
        .qr-wrapper img {
            width: 220px;
            height: 220px;
            display: block;
        }
        
        .qr-placeholder-icon {
            font-size: 4rem;
            color: var(--text-muted);
            margin-bottom: 1rem;
            opacity: 0.4;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s infinite linear;
            margin-bottom: 1rem;
        }

        /* Notificação flutuante */
        .toast-notify {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            background: #1e293b;
            border-left: 4px solid var(--primary);
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            display: none;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    </style>
</head>
<body data-dash-api-log-fullpage="0">

<div class="app-container">
    <!-- Menu Lateral (Sidebar) -->
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
            <a href="<?php echo htmlspecialchars($base); ?>/agentes-ia" class="active" title="Agente WhatsApp">
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

    <!-- Área Principal de Conteúdo -->
    <main class="main-content">
        <header class="header">
            <h1><?php echo htmlspecialchars($pageTitle); ?></h1>
            <div style="font-size: 0.8rem; background: rgba(129, 140, 248, 0.15); color: #818cf8; padding: 0.25rem 0.5rem; border-radius: 8px; font-weight: 500;">
                Integração WhatsApp
            </div>
        </header>

        <div class="agent-grid">
            <!-- Painel de Controle e Status -->
            <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: #818cf8;">
                        Status da Instância
                    </h2>
                    
                    <!-- Container de Status Dinâmico -->
                    <div id="statusWrapper" class="status-container status-DISCONNECTED">
                        <div class="status-indicator"></div>
                        <span id="statusText" class="status-text">Carregando...</span>
                    </div>

                    <!-- Dados da conexão -->
                    <ul class="info-list">
                        <li class="info-item">
                            <span class="info-label">Nome da Sessão:</span>
                            <span class="info-value" id="sessionName">-</span>
                        </li>
                        <li class="info-item">
                            <span class="info-label">Telefone Conectado:</span>
                            <span class="info-value" id="connectedPhone">-</span>
                        </li>
                        <li class="info-item">
                            <span class="info-label">Nível de Bateria:</span>
                            <span class="info-value" id="batteryLevel">-</span>
                        </li>
                        <li class="info-item">
                            <span class="info-label">Último Health Check:</span>
                            <span class="info-value" id="lastCheck">-</span>
                        </li>
                        <li class="info-item" id="syncProgressContainer" style="display: none; flex-direction: column; align-items: stretch; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span class="info-label" id="syncProgressLabel">Sincronizando WhatsApp...</span>
                                <span class="info-value" id="syncProgressText">0%</span>
                            </div>
                            <div style="width: 100%; background-color: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden;">
                                <div id="syncProgressBar" style="width: 0%; height: 100%; background-color: var(--primary); transition: width 0.3s ease;"></div>
                            </div>
                        </li>
                    </ul>
                </div>

                <!-- Botões de Ações -->
                <div class="btn-group">
                    <button id="btnStart" class="btn btn-primary" onclick="botStart()">
                        🔌 Conectar WhatsApp
                    </button>
                    <button id="btnStop" class="btn btn-secondary" onclick="botStop()" disabled>
                        ⏹️ Parar Agente
                    </button>
                    <button id="btnRestart" class="btn btn-secondary" onclick="botRestart()" disabled>
                        🔄 Reiniciar
                    </button>
                    <button id="btnLogout" class="btn btn-danger" onclick="botLogout()" disabled>
                        🚪 Desconectar Conta
                    </button>
                </div>
            </div>

            <!-- Painel do QR Code -->
            <div class="card" style="display: flex; flex-direction: column; justify-content: center;">
                <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: #818cf8; text-align: center;">
                    Emparelhamento (QR Code)
                </h2>
                
                <div id="qrCard" class="qr-card">
                    <!-- Estado Inicial / Desconectado -->
                    <div id="qrStateDisconnected">
                        <div class="qr-placeholder-icon">📴</div>
                        <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem;">Instância Parada</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 250px; margin: 0 auto;">
                            Clique em "Conectar WhatsApp" para iniciar a geração do QR Code.
                        </p>
                    </div>

                    <!-- Estado Carregando / Conectando -->
                    <div id="qrStateLoading" style="display: none;">
                        <div class="spinner" style="margin: 0 auto 1rem auto;"></div>
                        <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem;">Iniciando Serviços...</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 250px; margin: 0 auto;">
                            Por favor, aguarde enquanto o Baileys inicializa as dependências do canal.
                        </p>
                    </div>

                    <!-- Estado com QR Code Ativo -->
                    <div id="qrStateActive" style="display: none;">
                        <div class="qr-wrapper" style="margin: 0 auto 1.5rem auto;">
                            <img id="qrImage" src="" alt="QR Code WhatsApp">
                        </div>
                        <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem; color: #818cf8;">Escaneie o QR Code</h3>
                        <p style="color: var(--text-muted); font-size: 0.82rem; max-width: 300px; margin: 0 auto;">
                            Abra o WhatsApp no seu celular > <strong>Dispositivos conectados</strong> > <strong>Conectar um dispositivo</strong>.
                        </p>
                    </div>

                    <!-- Estado Conectado com Sucesso -->
                    <div id="qrStateConnected" style="display: none;">
                        <div style="font-size: 4rem; color: var(--success); margin-bottom: 1rem;">✅</div>
                        <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--success);">Agente Conectado!</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 260px; margin: 0 auto 1.5rem auto;">
                            Seu WhatsApp foi pareado com sucesso. O sistema já pode enviar e receber mensagens.
                        </p>
                        <a href="<?php echo htmlspecialchars($base); ?>/home" class="btn btn-primary" style="text-decoration: none;">
                            💬 Ir para Conversas
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>

<!-- Notificação Toast -->
<div id="toast" class="toast-notify"></div>

<script>window.API_BASE = <?php echo json_encode(rtrim($base, '/')); ?>;</script>
<script src="<?php echo htmlspecialchars(rtrim($base, '/') . '/js/dash-api-call-log.js'); ?>"></script>
<script src="<?php echo htmlspecialchars(rtrim($base, '/') . '/js/sidebar-expand.js'); ?>"></script>

<script>
    let statusPollInterval = null;
    let qrPollInterval = null;
    let isPollingQr = false;

    // Utilitário para exibir notificações
    function showToast(message, borderType = 'var(--primary)') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.borderLeftColor = borderType;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 4000);
    }

    // Função de Polling do Status Geral
    async function checkStatus() {
        try {
            const res = await fetch(window.API_BASE + '/api/omni/bot/status');
            if (!res.ok) throw new Error('Falha HTTP ' + res.status);
            const data = await res.json();
            
            updateUI(data);
        } catch (err) {
            console.error('Erro ao obter status:', err);
        }
    }

    // Polling específico para o QR Code
    async function pollQrCode() {
        if (!isPollingQr) return;
        try {
            const res = await fetch(window.API_BASE + '/api/omni/bot/qr');
            if (!res.ok) throw new Error('Falha HTTP ' + res.status);
            const data = await res.json();

            if (data.qrcode_base64) {
                // Exibe o QR Code recebido
                document.getElementById('qrStateLoading').style.display = 'none';
                document.getElementById('qrStateDisconnected').style.display = 'none';
                document.getElementById('qrStateConnected').style.display = 'none';
                document.getElementById('qrStateActive').style.display = 'block';
                
                // Trata caso a string venha apenas com os dados ou já formatada
                let src = data.qrcode_base64;
                if (!src.startsWith('data:image/')) {
                    src = 'data:image/png;base64,' + src;
                }
                document.getElementById('qrImage').src = src;
            } else if (data.qrcode) {
                document.getElementById('qrStateLoading').style.display = 'none';
                document.getElementById('qrStateDisconnected').style.display = 'none';
                document.getElementById('qrStateConnected').style.display = 'none';
                document.getElementById('qrStateActive').style.display = 'block';
                
                let src = data.qrcode;
                if (!src.startsWith('data:image/')) {
                    src = 'data:image/png;base64,' + src;
                }
                document.getElementById('qrImage').src = src;
            }
        } catch (err) {
            console.error('Erro no polling do QR:', err);
        }
    }

    // Inicia e para o polling do QR Code baseado no status
    function toggleQrPolling(shouldPoll) {
        if (shouldPoll) {
            if (!isPollingQr) {
                isPollingQr = true;
                pollQrCode(); // chamada imediata
                qrPollInterval = setInterval(pollQrCode, 3500);
            }
        } else {
            isPollingQr = false;
            if (qrPollInterval) {
                clearInterval(qrPollInterval);
                qrPollInterval = null;
            }
        }
    }

    // Atualiza todos os elementos visuais com base no estado do Bot
    function updateUI(bot) {
        const wrapper = document.getElementById('statusWrapper');
        const text = document.getElementById('statusText');
        
        // Remove classes de status antigas
        wrapper.className = 'status-container';
        
        const status = bot.status || 'DISCONNECTED';
        wrapper.classList.add('status-' + status);
        
        // Formata o texto amigável
        let friendlyStatusText = status;
        if (status === 'CONNECTED') friendlyStatusText = 'Agente Ativo / Conectado';
        else if (status === 'CONNECTING') friendlyStatusText = 'Estabelecendo Conexão';
        else if (status === 'QRCODE') friendlyStatusText = 'Aguardando Escaneamento (QR Code)';
        else if (status === 'DISCONNECTED') friendlyStatusText = 'Desconectado / Inativo';
        else if (status === 'error_session') friendlyStatusText = 'Falha de Sessão';
        
        text.textContent = friendlyStatusText;
        
        // Atualiza campos técnicos
        document.getElementById('sessionName').textContent = bot.session_name || '-';
        if (status === 'CONNECTED' && bot.phone_number) {
            document.getElementById('connectedPhone').textContent = '+' + bot.phone_number;
        } else {
            document.getElementById('connectedPhone').textContent = 'Não conectado';
        }
        document.getElementById('batteryLevel').textContent = bot.battery_level !== undefined ? bot.battery_level + '%' : 'Indisponível';
        
        if (bot.last_health_check) {
            try {
                const date = new Date(bot.last_health_check);
                document.getElementById('lastCheck').textContent = date.toLocaleString('pt-BR');
            } catch(e) {
                document.getElementById('lastCheck').textContent = bot.last_health_check;
            }
        } else {
            document.getElementById('lastCheck').textContent = 'Nenhuma';
        }

        // Sincronização Progress
        const syncContainer = document.getElementById('syncProgressContainer');
        const syncText = document.getElementById('syncProgressText');
        const syncBar = document.getElementById('syncProgressBar');
        const syncLabel = document.getElementById('syncProgressLabel');
        
        if (status === 'CONNECTED') {
            const progress = bot.sync_progress || 0;
            syncContainer.style.display = 'flex';
            syncText.textContent = progress + '%';
            syncBar.style.width = progress + '%';
            
            if (progress >= 100) {
                syncLabel.textContent = 'Sincronização Concluída';
                syncLabel.style.color = 'var(--success)';
                syncBar.style.backgroundColor = 'var(--success)';
            } else {
                syncLabel.textContent = 'Sincronizando WhatsApp...';
                syncLabel.style.color = '';
                syncBar.style.backgroundColor = 'var(--primary)';
            }
        } else {
            syncContainer.style.display = 'none';
        }

        // Habilita / desabilita botões de ação baseados no status
        const btnStart = document.getElementById('btnStart');
        const btnStop = document.getElementById('btnStop');
        const btnRestart = document.getElementById('btnRestart');
        const btnLogout = document.getElementById('btnLogout');

        if (status === 'CONNECTED') {
            btnStart.disabled = true;
            btnStop.disabled = false;
            btnRestart.disabled = false;
            btnLogout.disabled = false;
            
            toggleQrPolling(false);
            showQrCardState('CONNECTED');
        } else if (status === 'CONNECTING') {
            btnStart.disabled = true;
            btnStop.disabled = false;
            btnRestart.disabled = true;
            btnLogout.disabled = true;
            
            toggleQrPolling(false);
            showQrCardState('LOADING');
        } else if (status === 'QRCODE') {
            btnStart.disabled = true;
            btnStop.disabled = false;
            btnRestart.disabled = false;
            btnLogout.disabled = false;
            
            toggleQrPolling(true);
            // O próprio polling do QR vai exibir o QRStateActive quando tiver a imagem
        } else { // DISCONNECTED ou qualquer erro
            btnStart.disabled = false;
            btnStop.disabled = true;
            btnRestart.disabled = true;
            btnLogout.disabled = true;
            
            toggleQrPolling(false);
            showQrCardState('DISCONNECTED');
        }
    }

    // Auxiliar para alternar painéis dentro da caixa de pareamento (QR Code)
    function showQrCardState(state) {
        document.getElementById('qrStateDisconnected').style.display = state === 'DISCONNECTED' ? 'block' : 'none';
        document.getElementById('qrStateLoading').style.display = state === 'LOADING' ? 'block' : 'none';
        document.getElementById('qrStateConnected').style.display = state === 'CONNECTED' ? 'block' : 'none';
        if (state !== 'QRCODE') {
            document.getElementById('qrStateActive').style.display = 'none';
        }
    }

    // --- Ações HTTP ---

    async function botStart() {
        showToast('Iniciando o agente de WhatsApp...', 'var(--info)');
        showQrCardState('LOADING');
        document.getElementById('btnStart').disabled = true;
        try {
            const res = await fetch(window.API_BASE + '/api/omni/bot/start', { method: 'POST' });
            const data = await res.json();
            if (data.success || data.status === 'starting') {
                showToast('Serviço carregado! Aguardando o QR Code...', 'var(--success)');
                checkStatus();
            } else {
                throw new Error(data.error || 'Falha desconhecida');
            }
        } catch (err) {
            showToast('Erro ao iniciar o agente: ' + err.message, 'var(--danger)');
            checkStatus();
        }
    }

    async function botStop() {
        if (!confirm('Deseja realmente pausar o agente? Isso interromperá as automações.')) return;
        showToast('Parando o agente...', 'var(--warning)');
        try {
            const res = await fetch(window.API_BASE + '/api/omni/bot/stop', { method: 'POST' });
            if (res.ok) {
                showToast('Agente parado com sucesso.', 'var(--success)');
                checkStatus();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Falha ao parar');
            }
        } catch (err) {
            showToast('Erro ao parar o agente: ' + err.message, 'var(--danger)');
        }
    }

    async function botRestart() {
        showToast('Reiniciando instância...', 'var(--info)');
        try {
            const res = await fetch(window.API_BASE + '/api/omni/bot/restart', { method: 'POST' });
            if (res.ok) {
                showToast('Instância reiniciada. Aguardando status...', 'var(--success)');
                checkStatus();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Falha ao reiniciar');
            }
        } catch (err) {
            showToast('Erro ao reiniciar: ' + err.message, 'var(--danger)');
        }
    }

    async function botLogout() {
        if (!confirm('ATENÇÃO: Deslogar a conta apagará todas as chaves e credenciais pareadas neste navegador. Deseja prosseguir?')) return;
        showToast('Desconectando WhatsApp...', 'var(--danger)');
        try {
            const res = await fetch(window.API_BASE + '/api/omni/bot/logout', { method: 'DELETE' });
            if (res.ok) {
                showToast('Conta desconectada com sucesso. Pareie novamente.', 'var(--success)');
                checkStatus();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Falha ao deslogar');
            }
        } catch (err) {
            showToast('Erro ao deslogar: ' + err.message, 'var(--danger)');
        }
    }

    // --- WebSockets ---
    let wsConnection = null;
    function connectWebSocket() {
        var configUrl = (window.API_BASE || '') + '/api/omni/auth/ws-config';
        fetch(configUrl)
            .then(r => r.json())
            .then(config => {
                if (!config.enabled || !config.ws_url) return;
                
                wsConnection = new WebSocket(config.ws_url);
                wsConnection.onopen = () => console.log('WS Agentes IA conectado.');
                
                wsConnection.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        // Atualiza a interface ativamente para eventos do robô
                        if (payload.method === 'sync_progress') {
                            const progress = payload.params.progress || 0;
                            const syncContainer = document.getElementById('syncProgressContainer');
                            const syncText = document.getElementById('syncProgressText');
                            const syncBar = document.getElementById('syncProgressBar');
                            const syncLabel = document.getElementById('syncProgressLabel');
                            
                            syncContainer.style.display = 'flex';
                            syncText.textContent = progress + '%';
                            syncBar.style.width = progress + '%';
                            
                            if (progress >= 100) {
                                syncLabel.textContent = 'Sincronização Concluída';
                                syncLabel.style.color = 'var(--success)';
                                syncBar.style.backgroundColor = 'var(--success)';
                            } else {
                                syncLabel.textContent = 'Sincronizando WhatsApp...';
                                syncLabel.style.color = '';
                                syncBar.style.backgroundColor = 'var(--primary)';
                            }
                            
                            // Chama checkStatus também para sincronizar banco se precisar
                            if (progress >= 100) {
                                setTimeout(checkStatus, 1500);
                            }
                        } else if (payload.method === 'bot_system_event' || payload.method === 'update_bot_qr') {
                            checkStatus(); // Força a buscar o novo status da API, que já conterá a info atualizada
                        }
                    } catch (e) {}
                };
                
                wsConnection.onclose = () => {
                    setTimeout(connectWebSocket, 5000);
                };
            }).catch(e => console.error('WS Error:', e));
    }

    // Inicialização da Página
    document.addEventListener('DOMContentLoaded', () => {
        checkStatus();
        connectWebSocket();
        // Polling do status geral a cada 5 segundos (mantido como fallback e refresh)
        statusPollInterval = setInterval(checkStatus, 5000);
    });
</script>
</body>
</html>
