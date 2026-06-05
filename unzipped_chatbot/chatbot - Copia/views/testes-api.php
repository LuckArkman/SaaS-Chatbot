<?php
/** @var string $base */
/** @var string $saasApiBaseUrl */
/** @var string $saasWsRpcUriTemplate */
/** @var string $saasWsPythonExample */
$base = $base ?? '';
$saasApiBaseUrl = $saasApiBaseUrl ?? '';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Testes API — Mídia e ciclo do bot</title>
    <style>
        :root { --ink: #0f172a; --muted: #64748b; --line: #e2e8f0; --accent: #4338ca; --ok: #15803d; --err: #b91c1c; --warn: #b45309; }
        * { box-sizing: border-box; }
        body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #f8fafc; color: var(--ink); line-height: 1.5; }
        .wrap { max-width: 960px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
        h1 { font-size: 1.5rem; margin: 0 0 0.35rem; }
        .sub { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .nav { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
        .nav a { font-size: 0.85rem; color: var(--accent); text-decoration: none; padding: 0.35rem 0.65rem; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
        .nav a:hover { background: #eef2ff; }
        section { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }
        section h2 { font-size: 1.05rem; margin: 0 0 0.75rem; }
        section p.hint { font-size: 0.8rem; color: var(--muted); margin: 0 0 1rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted); margin-bottom: 0.25rem; }
        input[type="text"] { width: 100%; padding: 0.5rem 0.65rem; border: 1px solid var(--line); border-radius: 8px; font-size: 0.9rem; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        button, .btn { padding: 0.5rem 0.85rem; border-radius: 8px; border: 1px solid var(--line); background: #fff; font-size: 0.82rem; cursor: pointer; font-family: inherit; }
        button:hover:not(:disabled) { background: #f1f5f9; }
        button:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
        .btn-primary:hover:not(:disabled) { background: #3730a3; }
        .btn-suite { border-color: #c7d2fe; background: #eef2ff; color: #312e81; }
        #mediaTestsLog, #cycleTestsLog {
            margin-top: 1rem; max-height: 360px; overflow: auto; background: #0f172a; color: #e2e8f0;
            border-radius: 8px; padding: 0.75rem; font-family: ui-monospace, monospace; font-size: 0.72rem;
        }
        .media-log-line { margin-bottom: 0.35rem; white-space: pre-wrap; word-break: break-word; }
        .media-log-ok { color: #86efac; }
        .media-log-err { color: #fca5a5; }
        .media-log-warn { color: #fcd34d; }
        .media-log-info { color: #94a3b8; }
        code { background: #f1f5f9; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.85em; }
        .saas-meta { font-size: 0.78rem; color: var(--muted); margin-top: 0.5rem; }
    </style>
</head>
<body data-dash-api-log-fullpage="1">
<script>window.API_BASE = <?= json_encode($base, JSON_UNESCAPED_UNICODE) ?>;</script>
<div class="wrap">
    <h1>Testes de API</h1>
    <p class="sub">Ciclo do bot, WebSocket e suítes de mídia WhatsApp (scripts <code>test_*.js</code> integrados no painel).</p>
    <nav class="nav">
        <a href="<?= htmlspecialchars($base) ?>/programador/api">Consola OpenAPI</a>
        <a href="<?= htmlspecialchars($base) ?>/programador/ws-test">Teste WebSocket</a>
        <a href="<?= htmlspecialchars($base) ?>/gateway-webhook">Gateway webhook</a>
        <a href="<?= htmlspecialchars($base) ?>/registro-api">Registo API</a>
        <a href="<?= htmlspecialchars($base) ?>/home">Painel</a>
    </nav>

    <?php if ($saasApiBaseUrl !== ''): ?>
    <p class="saas-meta">SaaS: <code><?= htmlspecialchars($saasApiBaseUrl) ?></code></p>
    <?php endif; ?>

    <section id="cycle-bot">
        <h2>Ciclo do bot</h2>
        <p class="hint">Valida rotas proxy <code>/api/omni/bot/*</code>, auth e contatos.</p>
        <div class="btn-row" id="cycleBotButtons">
            <button type="button" data-cycle="bot/status">Status do bot</button>
            <button type="button" data-cycle="bot/start">Iniciar bot</button>
            <button type="button" data-cycle="bot/qr">QR Code</button>
            <button type="button" data-cycle="auth/me">Quem sou eu</button>
            <button type="button" data-cycle="contacts">Listar contatos</button>
            <button type="button" data-cycle="flows">Listar fluxos</button>
        </div>
        <div id="cycleTestsLog" aria-live="polite"></div>
    </section>

    <section id="media-tests">
        <h2>Mídia WhatsApp</h2>
        <p class="hint">
            Equivalente aos scripts Node:
            <code>test_media_and_calls.js</code>,
            <code>test_full_whatsapp_media.js</code>,
            <code>test_api_whatsapp_media.js</code>
            — via proxy <code>POST /api/omni/storage/upload</code>,
            <code>POST /api/omni/chat/send</code>,
            <code>POST /api/omni/gateway/webhook</code>.
        </p>
        <div class="grid">
            <div>
                <label for="mediaTestPhone">Telefone (DDI, só dígitos)</label>
                <input type="text" id="mediaTestPhone" value="5511999999999" placeholder="5511999999999">
            </div>
            <div>
                <label for="mediaTestConversation">conversation_id (opcional)</label>
                <input type="text" id="mediaTestConversation" placeholder="5511...@s.whatsapp.net">
            </div>
        </div>
        <div class="btn-row">
            <button type="button" class="btn-suite" data-media-suite="validation">Suíte 1 — Validação</button>
            <button type="button" class="btn-suite" data-media-suite="flow">Suíte 2 — Fluxo completo</button>
            <button type="button" class="btn-suite" data-media-suite="api">Suíte 3 — API REST</button>
            <button type="button" class="btn-primary" data-media-suite="all">Executar todas</button>
            <button type="button" id="mediaTestsClearLog">Limpar log</button>
        </div>
        <div id="mediaTestsLog" aria-live="polite"></div>
    </section>

    <section id="api-log-section">
        <h2>Registo de chamadas</h2>
        <p class="hint">Pedidos a <code>/api/omni/*</code> feitos nesta página.</p>
        <div id="dashApiLogMount"></div>
    </section>
</div>

<script src="<?= htmlspecialchars($base) ?>/js/dash-api-call-log.js"></script>
<script src="<?= htmlspecialchars($base) ?>/js/dash-media-tests.js"></script>
<script>
(function () {
    var api = (window.API_BASE || '') + '/api/omni/';
    var log = document.getElementById('cycleTestsLog');
    function line(msg, cls) {
        var d = document.createElement('div');
        d.className = 'media-log-line' + (cls ? ' media-log-' + cls : '');
        d.textContent = msg;
        log.appendChild(d);
        log.scrollTop = log.scrollHeight;
    }
    document.querySelectorAll('[data-cycle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var path = btn.getAttribute('data-cycle');
            var method = path.indexOf('bot/start') !== -1 ? 'POST' : 'GET';
            var url = api + path;
            line('→ ' + method + ' ' + url, 'info');
            fetch(url, { method: method, headers: { Accept: 'application/json' } })
                .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, t: t }; }); })
                .then(function (x) {
                    var body = x.t;
                    try { body = JSON.stringify(JSON.parse(x.t), null, 2); } catch (e) {}
                    line((x.ok ? '✅ ' : '❌ ') + x.status + '\n' + body, x.ok ? 'ok' : 'err');
                })
                .catch(function (e) { line('❌ ' + e.message, 'err'); });
        });
    });
    if (window.DashApiCallLog && document.getElementById('dashApiLogMount')) {
        window.DashApiCallLog.renderInto(document.getElementById('dashApiLogMount'), { toolbar: true });
    }
})();
</script>
</body>
</html>
