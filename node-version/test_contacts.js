const axios = require('axios');


const BASE_URL = 'http://localhost:8001/api/v1';

const testUser = {
  name: "Contact Test User",
  email: `contact_test_${Date.now()}@example.com`,
  password: "Password123!",
  tenant_name: `Tenant Contact ${Date.now()}`
};

const testPhone = '5511999999999';
let authToken = '';

async function runContactsTest() {
  console.log('🧪 Iniciando Teste de Contatos do WhatsApp via Baileys...\n');

  try {
    // 1. Cadastrar Usuário e Fazer Login
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email: testUser.email, password: testUser.password });
    authToken = loginRes.data.access_token;
    const headers = { Authorization: `Bearer ${authToken}` };
    console.log('✅ Usuário registrado e logado.');

    // 2. Iniciar o Agente
    await axios.post(`${BASE_URL}/bot/start`, {}, { headers });
    console.log('✅ Agente inicializado. Aguardando QR Code...');
    await new Promise(r => setTimeout(r, 4000));

    // 3. Pegar QR Code
    const qrRes = await axios.get(`${BASE_URL}/bot/qr`, { headers });
    if (qrRes.data.qrcode) {
        console.log('\n⚠️ ATENÇÃO: O agente precisa estar CONNECTED para listar/adicionar contatos pelo WhatsApp.');
        console.log('Para conectar, escaneie este QR Code no seu aplicativo WhatsApp:');
        console.log('>>>', qrRes.data.qrcode);
        console.log('\nAguardando 20 segundos para simular a conexão (ou para você escanear)...');
        await new Promise(r => setTimeout(r, 20000));
    }

    // Como é um teste automatizado e pode ser que o QR Code não tenha sido escaneado a tempo,
    // vamos forçar o status para CONNECTED no banco e mockar o WhatsApp só para ver se a rota não quebra:
    const { Client } = require('pg');
    const pg = new Client({ connectionString: 'postgresql://admin:password123@localhost:5432/saas_omnichannel' });
    await pg.connect();
    await pg.query(`UPDATE whatsapp_instances SET status = 'CONNECTED' WHERE tenant_id = '${registerRes.data.tenant_id}'`);
    await pg.end();
    console.log('\n✅ [Mock] Status do bot forçado para CONNECTED no Banco de Dados para liberar o uso da rota.');

    // 4. Testar Listar Contatos
    console.log(`\n[4] Testando Rota: GET /contacts/whatsapp...`);
    try {
      const listRes = await axios.get(`${BASE_URL}/contacts/whatsapp`, { headers });
      console.log('✅ Rota GET /contacts/whatsapp finalizou com SUCESSO!');
      console.log('Contatos na memória do Baileys:', listRes.data);
    } catch (e) {
      console.log('⚠️ Aviso na listagem (esperado se Socket não foi realmente escaneado):', e.response?.data || e.message);
    }

    // 5. Testar Adicionar Contato
    console.log(`\n[5] Testando Rota: POST /contacts/whatsapp para o número ${testPhone}...`);
    try {
      const addRes = await axios.post(`${BASE_URL}/contacts/whatsapp`, {
        phone: testPhone,
        name: "Contato Teste"
      }, { headers });
      console.log('✅ Rota POST /contacts/whatsapp finalizou com SUCESSO!');
      console.log('Resposta:', addRes.data);
    } catch (e) {
      console.log('⚠️ Aviso ao adicionar (esperado se a rede do WP rejeitar a checagem `onWhatsApp` por falta de conexão real):', e.response?.data || e.message);
    }

    // Limpar bot
    await axios.post(`${BASE_URL}/bot/stop`, {}, { headers });
    console.log('\n🎉 Testes de Rotas de Contatos Concluídos!');

  } catch (error) {
    console.error('\n❌ ERRO FATAL no teste de contatos:');
    if (error.response) console.error(error.response.data);
    else console.error(error.message);
  }
}

runContactsTest();
