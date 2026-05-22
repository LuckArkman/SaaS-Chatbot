<?php
// Script de teste PHP para renderizar o QR Code recebido via Base64 do backend Node.js

$base_url = 'http://host.docker.internal:8001/api/v1';

// 1. Credenciais de Teste
$credentials = [
    'email' => 'ws_flow_'.time().'@example.com', // Vamos criar um temp, ou usar um existente
    'password' => 'Password123!'
];

// Opcional: Registra o usuario temporario para garantir o login
$ch_reg = curl_init($base_url . '/auth/register');
curl_setopt($ch_reg, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_reg, CURLOPT_POST, true);
curl_setopt($ch_reg, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch_reg, CURLOPT_POSTFIELDS, json_encode([
    'email' => $credentials['email'],
    'password' => $credentials['password'],
    'name' => 'PHP QR Tester',
    'tenant_name' => 'Tenant PHP'
]));
curl_exec($ch_reg);
curl_close($ch_reg);

// 2. Fazer Login para obter o JWT
$ch_login = curl_init($base_url . '/auth/login');
curl_setopt($ch_login, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_login, CURLOPT_POST, true);
curl_setopt($ch_login, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch_login, CURLOPT_POSTFIELDS, json_encode($credentials));

$login_response = curl_exec($ch_login);
$login_data = json_decode($login_response, true);
curl_close($ch_login);

if (!isset($login_data['access_token'])) {
    die("Falha ao obter JWT Token: " . $login_response);
}

$jwt = $login_data['access_token'];

// 3. Iniciar o Bot
$ch_start = curl_init($base_url . '/bot/start');
curl_setopt($ch_start, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_start, CURLOPT_POST, true);
curl_setopt($ch_start, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $jwt,
    'Content-Type: application/json'
]);
curl_exec($ch_start);
curl_close($ch_start);

// Aguarda 3 segundos para o Baileys gerar o QR Code
sleep(3);

// 4. Obter o QR Code gerado (Base64)
$ch_qr = curl_init($base_url . '/bot/qr');
curl_setopt($ch_qr, CURLOPT_RETURNTRANSFER, true);
// O Backend manda json se não pedir event-stream!
curl_setopt($ch_qr, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $jwt,
    'Accept: application/json'
]);

$qr_response = curl_exec($ch_qr);
$qr_data = json_decode($qr_response, true);
curl_close($ch_qr);

$base64_qr = $qr_data['qrcode'] ?? null;
$status = $qr_data['status'] ?? 'UNKNOWN';

?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Teste de Renderização do QR Code em PHP</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }
        .card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: inline-block; }
        img { border: 1px solid #ddd; border-radius: 5px; padding: 10px; background: #fff; max-width: 300px; }
        .success { color: #28a745; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
    </style>
</head>
<body>

<div class="card">
    <h2>Validação do Base64 do WhatsApp</h2>
    <p>Status atual da Engine: <span class="<?= $status == 'QRCODE' ? 'warning' : 'success' ?>"><?= $status ?></span></p>
    
    <?php if ($base64_qr): ?>
        <p>O back-end retornou uma string Base64 válida. Renderizando abaixo:</p>
        
        <!-- O formato base64 sendo injetado dinamicamente via PHP -->
        <img src="<?= htmlspecialchars($base64_qr) ?>" alt="QR Code WhatsApp">
        
    <?php else: ?>
        <p>Nenhum QR Code retornado. (O Bot pode já estar CONNECTED ou demorou a gerar).</p>
        <pre><?= htmlspecialchars($qr_response) ?></pre>
    <?php endif; ?>
</div>

</body>
</html>
