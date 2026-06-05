<?php
/** @var string $base */
$pageTitle = 'Testes de mídia WhatsApp';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <link rel="stylesheet" href="<?= htmlspecialchars(rtrim($base, '/') . '/css/dash-media.css') ?>">
    <script>window.API_BASE = <?= json_encode(rtrim($base, '/')) ?>;</script>
</head>
<body data-dash-api-log-fullpage="0">
<main class="media-tests-page">
    <h1><?= htmlspecialchars($pageTitle) ?></h1>
    <p class="media-tests-intro">
        Suítes equivalentes aos scripts Node na raiz do projeto:
        <code>test_media_and_calls.js</code>,
        <code>test_full_whatsapp_media.js</code> e
        <code>test_api_whatsapp_media.js</code>.
        Usam o proxy local <code>/api/omni/storage/upload</code>,
        <code>/api/omni/chat/send</code> e
        <code>/api/omni/gateway/webhook</code>.
    </p>

    <div class="media-tests-form">
        <label>
            Telefone de teste (DDI + número)
            <input type="text" id="mediaTestPhone" value="5511999999999" placeholder="5511999999999">
        </label>
        <label>
            conversation_id (opcional — preenche JID se vazio)
            <input type="text" id="mediaTestConversation" placeholder="5511999999999@s.whatsapp.net">
        </label>
    </div>

    <div class="media-tests-actions">
        <button type="button" data-media-suite="validation">Suíte 1 — Validação</button>
        <button type="button" data-media-suite="flow">Suíte 2 — Fluxo completo</button>
        <button type="button" data-media-suite="api">Suíte 3 — API integração</button>
        <button type="button" class="primary" data-media-suite="all">Executar todas</button>
        <button type="button" id="mediaTestsClearLog">Limpar log</button>
        <a href="<?= htmlspecialchars(rtrim($base, '/') . '/home') ?>" style="font-size:0.85rem;margin-left:auto;align-self:center">← Conversas</a>
        <a href="<?= htmlspecialchars(rtrim($base, '/') . '/testes-api') ?>" style="font-size:0.85rem;align-self:center">Testes API</a>
    </div>

    <div id="mediaTestsLog" class="media-tests-log" aria-live="polite"></div>
</main>
<script src="<?= htmlspecialchars(rtrim($base, '/') . '/js/dash-whatsapp-media.js') ?>"></script>
<script src="<?= htmlspecialchars(rtrim($base, '/') . '/js/dash-media-tests.js') ?>"></script>
<script src="<?= htmlspecialchars(rtrim($base, '/') . '/js/dash-api-call-log.js') ?>"></script>
</body>
</html>
