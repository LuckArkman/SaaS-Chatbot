<?php
/** Scripts de mídia WhatsApp — incluir no final de home.php e páginas com chat. */
$base = $base ?? \App\Support\PublicBasePath::fromRequest();
$cssBase = rtrim($base, '/') . '/css/dash-media.css';
$jsBase = rtrim($base, '/') . '/js/';
?>
<link rel="stylesheet" href="<?= htmlspecialchars($cssBase) ?>">
<script src="<?= htmlspecialchars($jsBase . 'dash-whatsapp-media.js') ?>"></script>
<script src="<?= htmlspecialchars($jsBase . 'dash-chat-bind.js') ?>"></script>
