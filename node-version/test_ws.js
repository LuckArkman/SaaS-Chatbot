const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:8001/api/v1';
const WS_URL = 'ws://localhost:8001/api/v1/ws/';

// Dados de teste dinâmicos
const testUser = {
  name: "WS Test User",
  email: `wstest_${Date.now()}@example.com`,
  password: "Password123!",
  tenant_name: `Tenant WS ${Date.now()}`
};

async function runWsTest() {
  console.log('🧪 Iniciando teste de conexão WebSocket (Raw WS)...\n');

  try {
    // 1. Cadastrar Usuário para obter tenant_id e user_id
    console.log(`[1] Registrando usuário para o teste WS: ${testUser.email}...`);
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    
    const tenantId = registerRes.data.tenant_id;
    const userId = registerRes.data.id;
    console.log(`✅ Usuário criado! Tenant ID: ${tenantId} | User ID: ${userId}`);

    const token = registerRes.data.access_token || (await axios.post(`${BASE_URL}/auth/login`, { email: testUser.email, password: testUser.password })).data.access_token;
    
    // 2. Conectar via WebSocket usando o JWT
    const wsEndpoint = `${WS_URL}?token=${token}`;
    console.log(`\n[2] Conectando ao WebSocket nativo em: ${wsEndpoint}`);
    
    const ws = new WebSocket(wsEndpoint);

    ws.on('open', () => {
      console.log('🟢 CONEXÃO WEBSOCKET ESTABELECIDA COM SUCESSO!');
      
      // Envia uma mensagem para testar o echo ou broadcast (opcional)
      // Como o nosso WS escuta apenas do backend para o frontend, enviamos só pra garantir que não desconecta
      ws.send(JSON.stringify({ type: 'ping' }));
    });

    ws.on('message', (data) => {
      console.log('📥 Mensagem recebida via WS do Servidor:', data.toString());
    });

    ws.on('error', (err) => {
      console.error('❌ Erro no WebSocket:', err.message);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔴 WebSocket fechado. Code: ${code}, Reason: ${reason.toString()}`);
    });

    // Encerra a conexão após 5 segundos para não travar o script
    setTimeout(() => {
      console.log('\n⏳ Encerrando teste WS após 5 segundos...');
      ws.close();
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('\n❌ ERRO FATAL no teste WS:', error.message);
    if (error.response) {
      console.error(error.response.data);
    }
    process.exit(1);
  }
}

runWsTest();
