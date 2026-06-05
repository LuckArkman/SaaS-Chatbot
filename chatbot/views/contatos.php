<?php
/** @var string $base */
$base = $base ?? '';
$pageTitle = "Contatos";
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
            --bg-card: rgba(30, 41, 59, 0.45);
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
            --active-item: rgba(99, 102, 241, 0.15);
            --active-item-border: #6366f1;
            
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
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
            flex: 1; padding: 2.5rem; display: flex; flex-direction: column; gap: 2rem; overflow-y: auto;
            background: radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%);
        }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
        .header h1 { font-size: 1.6rem; font-weight: 700; color: var(--text-main); }
        
        /* Controles do topo */
        .controls-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        }
        .search-wrapper {
            position: relative;
            flex: 1;
            max-width: 400px;
        }
        .search-input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.5rem;
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text-main);
            font-family: inherit;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .search-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
            background: rgba(30, 41, 59, 0.8);
        }
        .search-icon {
            position: absolute;
            left: 0.85rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
        }
        
        /* Cartão Glass */
        .glass-card {
            background: var(--bg-card);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        
        /* Tabela premium */
        .glass-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }
        .glass-table th, .glass-table td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
        }
        .glass-table th {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(255, 255, 255, 0.02);
        }
        .glass-table tbody tr {
            transition: background 0.2s;
        }
        .glass-table tbody tr:hover {
            background: rgba(255, 255, 255, 0.02);
        }
        
        .contact-row-info {
            display: flex;
            align-items: center;
            gap: 0.85rem;
        }
        .contact-row-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: #fff;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.95rem;
            text-transform: uppercase;
            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.25);
            background-size: cover;
            background-position: center;
        }
        .contact-name-cell {
            font-weight: 500;
            color: var(--text-main);
        }
        .contact-phone-cell {
            color: #818cf8;
            font-family: monospace;
            font-size: 0.95rem;
        }
        
        /* Botões */
        .btn-premium {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.7rem 1.25rem;
            border-radius: 12px;
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 600;
            color: #fff;
            background: var(--primary);
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .btn-premium:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
        }
        
        .btn-icon {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            color: var(--text-main);
            width: 34px;
            height: 34px;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .btn-icon:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        .btn-icon.edit:hover {
            border-color: var(--warning);
            color: var(--warning);
        }
        .btn-icon.delete:hover {
            border-color: var(--danger);
            color: var(--danger);
        }
        
        /* Modais */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; pointer-events: none;
            transition: opacity 0.3s;
            z-index: 1000;
        }
        .modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }
        .modal-container {
            background: #1e293b;
            border: 1px solid var(--border);
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
            transform: translateY(-20px);
            transition: transform 0.3s;
        }
        .modal-overlay.active .modal-container {
            transform: translateY(0);
        }
        .modal-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-main); }
        .modal-close {
            background: none; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer;
        }
        .modal-close:hover { color: var(--text-main); }
        
        .modal-body {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
        }
        .form-group label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-muted);
        }
        .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text-main);
            font-family: inherit;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        .modal-footer {
            padding: 1.25rem 1.5rem;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
        }
        .btn-cancel {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-muted);
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s;
        }
        .btn-cancel:hover {
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.02);
        }
        
        /* Toast Notification */
        .toast-notify {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: rgba(30, 41, 59, 0.9);
            backdrop-filter: blur(12px);
            border-left: 4px solid var(--primary);
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s;
            z-index: 1100;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .toast-notify.active {
            transform: translateY(0);
            opacity: 1;
        }
        .toast-icon { font-size: 1.2rem; }
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
            <a href="<?php echo htmlspecialchars($base); ?>/contatos" class="active" title="Contatos">
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

        <div class="controls-row">
            <div class="search-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" id="contactSearch" class="search-input" placeholder="Pesquisar contatos por nome ou telefone...">
            </div>
            <button class="btn-premium" id="btnAddContact">
                <span>➕</span> Adicionar Contato
            </button>
        </div>

        <div class="glass-card">
            <table class="glass-table">
                <thead>
                    <tr>
                        <th>Contato</th>
                        <th>Telefone / WhatsApp</th>
                        <th style="text-align: right; width: 150px;">Ações</th>
                    </tr>
                </thead>
                <tbody id="contactsTableBody">
                    <tr>
                        <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                            Carregando contatos...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </main>
</div>

<!-- Modal Adicionar Contato -->
<div class="modal-overlay" id="modalAdd">
    <div class="modal-container">
        <div class="modal-header">
            <h3>Novo Contato WhatsApp</h3>
            <button class="modal-close" onclick="closeModal('modalAdd')">&times;</button>
        </div>
        <form id="formAddContact">
            <div class="modal-body">
                <div class="form-group">
                    <label for="addName">Nome Completo</label>
                    <input type="text" id="addName" class="form-input" placeholder="Ex.: João da Silva" required>
                </div>
                <div class="form-group">
                    <label for="addPhone">Número WhatsApp (com DDI + DDD)</label>
                    <input type="text" id="addPhone" class="form-input" placeholder="Ex.: 5511999999999" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closeModal('modalAdd')">Cancelar</button>
                <button type="submit" class="btn-premium">Salvar Contato</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal Editar Contato -->
<div class="modal-overlay" id="modalEdit">
    <div class="modal-container">
        <div class="modal-header">
            <h3>Editar Contato</h3>
            <button class="modal-close" onclick="closeModal('modalEdit')">&times;</button>
        </div>
        <form id="formEditContact">
            <input type="hidden" id="editPhoneOriginal">
            <div class="modal-body">
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="text" id="editPhoneDisplay" class="form-input" disabled style="opacity: 0.6;">
                </div>
                <div class="form-group">
                    <label for="editName">Nome Completo</label>
                    <input type="text" id="editName" class="form-input" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closeModal('modalEdit')">Cancelar</button>
                <button type="submit" class="btn-premium">Atualizar</button>
            </div>
        </form>
    </div>
</div>

<!-- Toast -->
<div class="toast-notify" id="toast">
    <span class="toast-icon" id="toastIcon">ℹ️</span>
    <span id="toastMsg">Notificação do sistema</span>
</div>

<script>window.API_BASE = <?= json_encode(rtrim($base, '/')) ?>;</script>
<script src="<?php echo htmlspecialchars(rtrim($base, '/') . '/js/dash-api-call-log.js'); ?>"></script>
<script src="<?php echo htmlspecialchars(rtrim($base, '/') . '/js/sidebar-expand.js'); ?>"></script>

<script>
    var allContacts = [];

    // Carrega a lista de contatos do WhatsApp (ao vivo via Baileys) com fallback para o banco local
    function fetchContacts() {
        var tbody = document.getElementById('contactsTableBody');
        var url = window.API_BASE + '/api/omni/contacts/whatsapp';
        
        fetch(url, { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                var list = Array.isArray(res) ? res :
                           (res.contacts || res.data || res.items || []);
                // Normalizar campos para exibição
                list = list.map(function(c) {
                    var phone = c.contact_phone || c.phone_number || c.phone ||
                                (c.id ? c.id.split('@')[0] : '');
                    var name = c.contact_name || c.name || c.notify || c.pushname ||
                               c.full_name || phone;
                    return Object.assign({}, c, {
                        phone_number: phone,
                        full_name: name
                    });
                }).filter(function(c) {
                    // Filtrar apenas contatos (não grupos) para a agenda
                    return !c.is_group && !(String(c.id || '').includes('@g.us'));
                });
                allContacts = list;
                renderContacts(list);
            })
            .catch(function(err) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger); padding: 3rem;">Erro ao carregar contatos: ' + err.message + '</td></tr>';
            });
    }

    // Renderiza a lista na tabela
    function renderContacts(list) {
        var tbody = document.getElementById('contactsTableBody');
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 3rem;">Nenhum contato cadastrado.</td></tr>';
            return;
        }

        var html = '';
        list.forEach(function(c) {
            var name = c.contact_name || c.name || c.full_name || 'Contato sem nome';
            var phone = c.contact_phone || c.phone || c.phone_number || '';
            var profilePic = c.profile_pic_url || '';
            var initial = name.charAt(0).toUpperCase();
            
            var avatarStyle = profilePic ? ' style="background-image: url(\'' + profilePic + '\'); background-size: cover; background-position: center; color: transparent;"' : '';
            var avatarContent = profilePic ? '' : initial;
            
            html += '<tr>';
            html += '    <td>';
            html += '        <div class="contact-row-info">';
            html += '            <div class="contact-row-avatar"' + avatarStyle + '>' + avatarContent + '</div>';
            html += '            <div class="contact-name-cell">' + name + '</div>';
            html += '        </div>';
            html += '    </td>';
            html += '    <td><span class="contact-phone-cell">' + phone + '</span></td>';
            html += '    <td style="text-align: right;">';
            html += '        <button class="btn-icon edit" onclick="openEditModal(\'' + phone + '\', \'' + name.replace(/'/g, "\\'") + '\')" title="Editar Contato">✏️</button>';
            html += '        <button class="btn-icon delete" onclick="deleteContact(\'' + phone + '\')" title="Deletar Contato">🗑️</button>';
            html += '    </td>';
            html += '</tr>';
        });
        tbody.innerHTML = html;
    }

    // Modais
    function openModal(id) {
        document.getElementById(id).classList.add('active');
    }
    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    document.getElementById('btnAddContact').addEventListener('click', function() {
        document.getElementById('formAddContact').reset();
        openModal('modalAdd');
    });

    function openEditModal(phone, name) {
        document.getElementById('editPhoneOriginal').value = phone;
        document.getElementById('editPhoneDisplay').value = phone;
        document.getElementById('editName').value = name;
        openModal('modalEdit');
    }

    // Toast
    function showToast(msg, type) {
        var toast = document.getElementById('toast');
        var icon = document.getElementById('toastIcon');
        var msgEl = document.getElementById('toastMsg');
        
        msgEl.textContent = msg;
        if (type === 'success') {
            toast.style.borderLeftColor = 'var(--success)';
            icon.textContent = '✅';
        } else if (type === 'error') {
            toast.style.borderLeftColor = 'var(--danger)';
            icon.textContent = '❌';
        } else {
            toast.style.borderLeftColor = 'var(--primary)';
            icon.textContent = 'ℹ️';
        }
        
        toast.classList.add('active');
        setTimeout(function() {
            toast.classList.remove('active');
        }, 4000);
    }

    // CRUD: Adicionar
    document.getElementById('formAddContact').addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('addName').value.trim();
        var phone = document.getElementById('addPhone').value.trim();
        
        var url = window.API_BASE + '/api/omni/contacts/whatsapp';
        
        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, name: name })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success || res.persisted) {
                closeModal('modalAdd');
                showToast('Contato adicionado com sucesso!', 'success');
                fetchContacts();
            } else {
                showToast(res.error || res.detail || 'Erro ao salvar contato', 'error');
            }
        })
        .catch(function(err) {
            showToast('Erro de rede: ' + err.message, 'error');
        });
    });

    // CRUD: Editar
    document.getElementById('formEditContact').addEventListener('submit', function(e) {
        e.preventDefault();
        var phone = document.getElementById('editPhoneOriginal').value;
        var name = document.getElementById('editName').value.trim();
        
        var url = window.API_BASE + '/api/omni/contacts/whatsapp?phone=' + encodeURIComponent(phone);
        
        fetch(url, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success || res.contact) {
                closeModal('modalEdit');
                showToast('Contato atualizado com sucesso!', 'success');
                fetchContacts();
            } else {
                showToast(res.error || 'Erro ao atualizar contato', 'error');
            }
        })
        .catch(function(err) {
            showToast('Erro de rede: ' + err.message, 'error');
        });
    });

    // CRUD: Deletar
    function deleteContact(phone) {
        if (!confirm('Deseja realmente remover este contato do sistema?')) return;
        
        var url = window.API_BASE + '/api/omni/contacts/whatsapp?phone=' + encodeURIComponent(phone);
        
        fetch(url, {
            method: 'DELETE',
            credentials: 'same-origin'
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success) {
                showToast('Contato removido com sucesso!', 'success');
                fetchContacts();
            } else {
                showToast(res.error || 'Erro ao remover contato', 'error');
            }
        })
        .catch(function(err) {
            showToast('Erro de rede: ' + err.message, 'error');
        });
    }

    // Busca local (filtro instantâneo)
    document.getElementById('contactSearch').addEventListener('input', function(e) {
        var query = e.target.value.toLowerCase().trim();
        var filtered = allContacts.filter(function(c) {
            var name = (c.name || c.full_name || '').toLowerCase();
            var phone = (c.phone || c.phone_number || '').toLowerCase();
            return name.indexOf(query) !== -1 || phone.indexOf(query) !== -1;
        });
        renderContacts(filtered);
    });

    // Início
    fetchContacts();
</script>
</body>
</html>
