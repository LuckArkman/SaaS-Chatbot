const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://76.13.168.200:8001/api/v1';

const testUser = {
  name: "WS Flow Test User",
  email: `ws_flow_${Date.now()}@example.com`,
  password: "Password123!",
  tenant_name: `Tenant WS ${Date.now()}`
};

let authToken = '';
let tenantId = '';

async function runWebSocketFlowTest() {
  console.log('🧪 Iniciando Auditoria do Fluxo de Mensagens para o Front-end...\n');

  try {
    // 1. Cadastrar e Logar
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    tenantId = registerRes.data.tenant_id;
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email: testUser.email, password: testUser.password });
    authToken = loginRes.data.access_token;
    console.log('✅ Usuário registrado e autenticado. Tenant ID:', tenantId);

    // 2. Conectar WebSocket com Token JWT
    console.log('\n[2] Estabelecendo conexão WebSocket simulando o Front-end...');
    const wsUrl = `ws://76.13.168.200:8001/api/v1/ws/?token=${authToken}`;
    const wsClient = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      wsClient.on('open', () => {
        console.log('✅ Frontend conectado com sucesso via WebSocket nativo!');
        resolve();
      });
      wsClient.on('error', reject);
    });

    let messageReceived = false;
    
    // Escutando eventos do Backend
    wsClient.on('message', (data) => {
      const parsed = JSON.parse(data);
      console.log('📩 [FRONTEND] Novo evento recebido em tempo real:', parsed);
      
      if (parsed.method === 'receive_message' && parsed.params.content === 'Mensagem Auditada com Sucesso!') {
        messageReceived = true;
      }
    });

    // 3. Simular o Recebimento de uma Mensagem Externa no Webhook
    // Como testar a engine inteira sem ler QR code? O GatewayController age como ponte externa
    // mas também aplicamos no whatsappCore! Aqui simulamos o Gateway.
    console.log('\n[3] Simulando injeção de mensagem via Gateway (Webhook)...');
    
    await axios.post(`${BASE_URL}/gateway/whatsapp`, {
      session: tenantId,
      event: 'messages.upsert',
      payload: {
        id: `mock_${Date.now()}`,
        from: '5511999999999@s.whatsapp.net',
        pushName: 'Auditoria Bot',
        text: 'Mensagem Auditada com Sucesso!'
      }
    });
    console.log('✅ Webhook disparado com HTTP 202 Accepted.');

    // 4. Aguardar o WebSocket receber
    console.log('\n⏳ Aguardando propagação no WebSocket (max 5s)...');
    for (let i = 0; i < 50; i++) {
      if (messageReceived) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (messageReceived) {
      console.log('\n🎉 SUCESSO ABSOLUTO! O fluxo completo (Webhook -> WS -> Frontend) está isolado e funcional!');
    } else {
      console.error('\n❌ FALHA! A mensagem não chegou no WebSocket do Frontend.');
    }

    wsClient.close();

  } catch (error) {
    console.error('\n❌ ERRO FATAL no teste:', error.response?.data || error.message);
  }
}

runWebSocketFlowTest();
