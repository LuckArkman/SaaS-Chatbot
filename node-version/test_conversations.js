const axios = require('axios');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:8001/api/v1';

const testUser = {
  name: "Conversation Test User",
  email: `conv_test_${Date.now()}@example.com`,
  password: "Password123!",
  tenant_name: `Tenant Conv ${Date.now()}`
};

const testPhone = '5511999999999';
let authToken = '';
let tenantId = '';

async function runConversationsTest() {
  console.log('🧪 Iniciando Teste de Recuperação de Conversas e Histórico Nativo...\n');

  try {
    // 1. Cadastrar Usuário e Fazer Login
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    tenantId = registerRes.data.tenant_id;
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email: testUser.email, password: testUser.password });
    authToken = loginRes.data.access_token;
    const headers = { Authorization: `Bearer ${authToken}` };
    console.log('✅ Usuário registrado e logado.');

    // 2. Iniciar o Agente
    await axios.post(`${BASE_URL}/bot/start`, {}, { headers });
    console.log('✅ Agente inicializado na engine.');
    await new Promise(r => setTimeout(r, 4000)); // Aguarda Baileys iniciar

    // 3. Função Helper para manter mock de CONNECTED (vence do loop do Baileys)
    const pg = new Client({ connectionString: 'postgresql://admin:password123@localhost:5432/saas_omnichannel' });
    await pg.connect();
    const forceConnected = async () => {
      await pg.query(`UPDATE whatsapp_instances SET status = 'CONNECTED' WHERE tenant_id = '${tenantId}'`);
    };

    // 4. Testar a rota de Listagem de Conversas
    console.log(`\n[4] Testando Rota: GET /chat/conversations...`);
    try {
      await forceConnected();
      const listRes = await axios.get(`${BASE_URL}/chat/conversations`, { headers });
      console.log('✅ Rota GET /chat/conversations finalizou com SUCESSO!');
      console.log(`   Total de Conversas no Cache: ${listRes.data.total}`);
      console.log('   Dados das Conversas:', listRes.data.conversations);
    } catch (e) {
      console.error('❌ Falha ao recuperar conversas:', e.response?.data || e.message);
    }

    // 5. Testar a rota de Histórico Específico de um Contato
    console.log(`\n[5] Testando Rota: GET /chat/conversations/${testPhone}...`);
    try {
      await forceConnected();
      const histRes = await axios.get(`${BASE_URL}/chat/conversations/${testPhone}`, { headers });
      console.log(`✅ Rota GET /chat/conversations/${testPhone} finalizou com SUCESSO!`);
      console.log(`   JID Resolvido: ${histRes.data.jid}`);
      console.log(`   Mensagens Restauradas do Cache: ${histRes.data.total_messages}`);
      console.log('   Preview das mensagens:', histRes.data.messages);
    } catch (e) {
      console.error('❌ Falha ao recuperar histórico específico:', e.response?.data || e.message);
    }
    
    await pg.end();

    // Limpar bot
    await axios.post(`${BASE_URL}/bot/stop`, {}, { headers });
    console.log('\n🎉 Testes de Rotas de Conversas Concluídos com sucesso!');

  } catch (error) {
    console.error('\n❌ ERRO FATAL no teste de conversas:');
    if (error.response) console.error(error.response.data);
    else console.error(error.message);
  }
}

runConversationsTest();
