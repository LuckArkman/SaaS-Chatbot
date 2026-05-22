const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8001/api/v1';

// Dados de teste dinâmicos
const testUser = {
  name: "Test User",
  email: `test_${Date.now()}@example.com`,
  password: "Password123!",
  tenant_name: `Tenant ${Date.now()}`
};

const testPhone = '5511999999999';
let authToken = '';

async function runTests() {
  console.log('🧪 Iniciando testes de integração da API SaaS Chatbot...\n');

  try {
    // 1. Cadastrar Usuário e Tenant
    console.log(`[1] Registrando usuário: ${testUser.email}...`);
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('✅ Cadastro realizado com sucesso!', registerRes.data);

    // 2. Fazer Login
    console.log(`\n[2] Fazendo login...`);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginRes.data.access_token;
    console.log('✅ Login realizado com sucesso! Token JWT recebido.');

    const headers = { Authorization: `Bearer ${authToken}` };

    // 3. Inicializar o Agente (WhatsApp Bot)
    console.log(`\n[3] Solicitando inicialização do Agente (Start)...`);
    const startRes = await axios.post(`${BASE_URL}/bot/start`, {}, { headers });
    console.log('✅ Agente inicializado!', startRes.data);

    // Esperar um pouco para a engine gerar o QR Code
    console.log('\n⏳ Aguardando 3 segundos para a geração do QR Code...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Buscar o QR Code
    console.log(`\n[4] Buscando QR Code do Agente...`);
    try {
      const qrRes = await axios.get(`${BASE_URL}/bot/qr`, { headers });
      console.log('✅ QR Code obtido com sucesso!');
      if (qrRes.data.qrcode) {
        console.log(`Base64 Data Completo:\n${qrRes.data.qrcode}`);
      } else {
        console.log('⚠️ O status atual não exige QR Code:', qrRes.data);
      }
    } catch (err) {
      console.log('⚠️ Não foi possível obter QR Code neste momento (pode já estar conectado ou gerando).', err.response?.data || err.message);
    }

    // 5. Enviar uma Mensagem (Teste de disparo)
    console.log(`\n[5] Simulando o envio de uma mensagem para ${testPhone}...`);
    try {
      const sendRes = await axios.post(`${BASE_URL}/chat/send`, {
        to: testPhone,
        content: "Olá! Esta é uma mensagem de teste do script automatizado."
      }, { headers });
      console.log('✅ Comando de envio processado!', sendRes.data);
    } catch (err) {
      console.error('❌ Falha ao enviar mensagem:', err.response?.data || err.message);
    }

    // 6. Consultar Histórico de Mensagens
    console.log(`\n[6] Consultando histórico de mensagens para ${testPhone}...`);
    try {
      const historyRes = await axios.get(`${BASE_URL}/chat/history/${testPhone}`, { headers });
      console.log(`✅ Histórico obtido! Quantidade de mensagens registradas: ${historyRes.data.messages?.length || 0}`);
    } catch (err) {
      console.error('❌ Falha ao buscar histórico:', err.response?.data || err.message);
    }

    // 7. Reiniciar o Agente
    console.log(`\n[7] Solicitando reinício do Agente (Restart)...`);
    const restartRes = await axios.post(`${BASE_URL}/bot/restart`, {}, { headers });
    console.log('✅ Agente reiniciado com sucesso!', restartRes.data);

    // 8. Parar o Agente
    console.log(`\n[8] Parando o Agente (Stop)...`);
    const stopRes = await axios.post(`${BASE_URL}/bot/stop`, {}, { headers });
    console.log('✅ Agente parado com sucesso!', stopRes.data);

    console.log('\n🎉 Todos os testes de fluxo principal foram executados!');
  } catch (error) {
    console.error('\n❌ ERRO FATAL no fluxo de teste:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTests();
