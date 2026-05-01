<?php
// Script de teste PHP completo para Fluxo de Chat (Envio via API + Recebimento via WS)

$base_url = 'http://host.docker.internal:8001/api/v1';

// 1. Processamento de Ações AJAX (Envio de Mensagem)
if (isset($_GET['action']) && $_GET['action'] == 'send') {
    $jwt = $_POST['token'] ?? '';
    $phone = $_POST['phone'] ?? '';
    $msg = $_POST['message'] ?? '';

    $ch = curl_init($base_url . '/chat/send');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $jwt,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'conversation_id' => $phone,
        'content' => $msg
    ]));
    
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    header('Content-Type: application/json');
    echo json_encode(['status' => $httpcode, 'response' => json_decode($response)]);
    exit;
}

// 2. Fluxo Normal: Autenticar e Carregar Tela
$credentials = [
    'email' => 'admin@admin.com', // Ajuste para o email de teste que você usa no painel
    'password' => '123456' // Ajuste para a senha real
];

// Vamos tentar registrar um usuário de teste caso não exista
$ch_reg = curl_init($base_url . '/auth/register');
curl_setopt($ch_reg, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_reg, CURLOPT_POST, true);
curl_setopt($ch_reg, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch_reg, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'chat_test_' . time() . '@example.com',
    'password' => 'Password123!',
    'name' => 'PHP Chat Tester',
    'tenant_name' => 'Tenant Chat PHP'
]));
$reg_resp = curl_exec($ch_reg);
curl_close($ch_reg);

$reg_data = json_decode($reg_resp, true);

// Fazer Login
$ch_login = curl_init($base_url . '/auth/login');
curl_setopt($ch_login, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_login, CURLOPT_POST, true);
curl_setopt($ch_login, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch_login, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'chat_test_' . time() . '@example.com', // Fallback, ideal seria usar do registro acima, ajustando...
]));

// Corrigindo a logica de credenciais para usar a gerada
$test_email = 'chat_test_' . time() . '@example.com';
$test_pass = 'Password123!';

$ch_reg = curl_init($base_url . '/auth/register');
curl_setopt($ch_reg, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_reg, CURLOPT_POST, true);
curl_setopt($ch_reg, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch_reg, CURLOPT_POSTFIELDS, json_encode([
    'email' => $test_email,
    'password' => $test_pass,
    'name' => 'PHP Chat Tester',
    'tenant_name' => 'Tenant Chat PHP'
]));
curl_exec($ch_reg);
curl_close($ch_reg);

$ch_login = curl_init($base_url . '/auth/login');
curl_setopt($ch_login, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_login, CURLOPT_POST, true);
curl_setopt($ch_login, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch_login, CURLOPT_POSTFIELDS, json_encode([
    'email' => $test_email,
    'password' => $test_pass
]));
$login_response = curl_exec($ch_login);
$login_data = json_decode($login_response, true);
curl_close($ch_login);

$jwt = $login_data['access_token'] ?? null;

if (!$jwt) {
    die("Falha na autenticação: " . $login_response);
}

// Iniciar Bot (necessário para enviar mensagens se a engine exigir status CONNECTED, mas como o RabbitMQ enfileira, podemos testar mesmo sem conectar)
$ch_start = curl_init($base_url . '/bot/start');
curl_setopt($ch_start, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch_start, CURLOPT_POST, true);
curl_setopt($ch_start, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $jwt]);
curl_exec($ch_start);
curl_close($ch_start);

?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>SaaS Chatbot - Teste de Fluxo Completo</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; display: flex; gap: 20px; }
        .box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); flex: 1; }
        .console { background: #1e1e1e; color: #00ff00; padding: 15px; height: 300px; overflow-y: auto; font-family: monospace; border-radius: 5px; }
        input, button { padding: 10px; margin-top: 10px; width: 100%; box-sizing: border-box; }
        button { background: #007bff; color: white; border: none; cursor: pointer; border-radius: 4px; }
        button:hover { background: #0056b3; }
        .msg { margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    </style>
</head>
<body>

    <div class="box">
        <h2>Painel de Envio (API)</h2>
        <p>Preencha para enviar a mensagem via <b>POST /chat/send</b></p>
        
        <label>Telefone (conversation_id):</label>
        <input type="text" id="phone" value="5511999999999" placeholder="Ex: 5511999999999">
        
        <label>Mensagem:</label>
        <input type="text" id="message" value="Oi, testando via script PHP!" placeholder="Sua mensagem...">
        
        <button onclick="sendMessage()">🚀 Enviar Mensagem</button>

        <div style="margin-top:20px; padding: 10px; background: #e9ecef;" id="api_response">
            Aguardando envio...
        </div>
    </div>

    <div class="box">
        <h2>Monitor WebSocket (WS)</h2>
        <p>Eventos em tempo real recebidos de <b>ws://.../api/v1/ws/</b></p>
        <div class="console" id="ws_console">
            <div class="msg">Conectando ao WebSocket...</div>
        </div>
    </div>

    <script>
        const jwt = "<?= $jwt ?>";
        // Altere host.docker.internal para localhost se for rodar direto no navegador de fora
        const wsUrl = "ws://localhost:8001/api/v1/ws/?token=" + jwt;
        const ws = new WebSocket(wsUrl);

        const logWs = (msg, color = "#00ff00") => {
            const el = document.getElementById('ws_console');
            el.innerHTML += `<div class="msg" style="color: ${color}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
            el.scrollTop = el.scrollHeight;
        };

        ws.onopen = () => logWs("✅ WebSocket Conectado e Autenticado!");
        ws.onclose = () => logWs("❌ WebSocket Desconectado.", "red");
        ws.onerror = (e) => logWs("⚠️ Erro no WebSocket", "yellow");

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                logWs("📥 Evento Recebido: <br>" + JSON.stringify(data, null, 2));
            } catch (e) {
                logWs("📥 Dado Bruto: " + event.data);
            }
        };

        async function sendMessage() {
            const phone = document.getElementById('phone').value;
            const message = document.getElementById('message').value;
            const respDiv = document.getElementById('api_response');
            
            respDiv.innerHTML = "Enviando...";

            const formData = new URLSearchParams();
            formData.append('token', jwt);
            formData.append('phone', phone);
            formData.append('message', message);

            try {
                const res = await fetch('?action=send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
                
                const data = await res.json();
                respDiv.innerHTML = `<b>Status:</b> ${data.status} <br><b>Resposta:</b> ${JSON.stringify(data.response)}`;
            } catch (error) {
                respDiv.innerHTML = `<b>Erro:</b> ${error}`;
            }
        }
    </script>
</body>
</html>
