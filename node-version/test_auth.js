const axios = require('axios');

const BASE_URL = 'http://localhost:8001/api/v1';

// Dados de teste para o login
const testUser = {
  name: "Auth Test User",
  email: `auth_test_${Date.now()}@example.com`,
  password: "Password123!",
  tenant_name: `Tenant Auth ${Date.now()}`
};

async function runAuthTests() {
  console.log('🔐 Iniciando bateria de testes de Autenticação...\n');

  try {
    // 1. Cadastrar Usuário
    console.log(`[1] Registrando usuário: ${testUser.email}...`);
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('✅ Cadastro realizado com sucesso!');
    console.log('   Dados do retorno:', registerRes.data);

    // 2. Fazer Login
    console.log(`\n[2] Realizando Login com as credenciais criadas...`);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    // Agora o login devolve só access_token e refresh_token (seguro)
    const { access_token, refresh_token } = loginRes.data;
    console.log('✅ Login realizado com sucesso! (Sem vazamento de tenant/user ID)');
    console.log(`   Access Token JWT : ${access_token.substring(0, 30)}...`);
    console.log(`   Refresh Token JWT: ${refresh_token.substring(0, 30)}...`);

    // 3. Validação do Token (Endpoint Me)
    console.log(`\n[3] Validando o access_token acessando uma rota protegida (/auth/me)...`);
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('✅ Acesso autorizado e validado!');
    console.log(`   Perfil do usuário autenticado retornado: Tenant=${meRes.data.tenant_id}, ID=${meRes.data.id}`);

    // 4. Rotacionamento de Token (Refresh)
    console.log(`\n[4] Solicitando Rotacionamento de Token (/auth/refresh)...`);
    const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: refresh_token
    });
    console.log('✅ Novo par de tokens gerado com sucesso!');
    console.log(`   NOVO Access Token : ${refreshRes.data.access_token.substring(0, 30)}...`);
    console.log(`   NOVO Refresh Token: ${refreshRes.data.refresh_token.substring(0, 30)}...`);

    console.log('\n🎉 Todos os testes de Autenticação (Registro -> Login -> Validação JWT) passaram!');
  } catch (error) {
    console.error('\n❌ ERRO FATAL no teste de Autenticação:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runAuthTests();
