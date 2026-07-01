const axios = require('axios');
const http = require('http');

const API_URL = 'http://localhost:8001/api/v1';
const HEALTH_URL = 'http://localhost:8001/health';

let accessToken = '';
let tenantId = '';
const TEST_EMAIL = `test_${Date.now()}@hotspot.com`;
const TEST_PASSWORD = 'Password123!';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('🚀 Iniciando rotina de testes do Backend SaaS-Chatbot...');

    // 1. Health Check
    try {
        console.log('\n--- 1. Health Check ---');
        const healthRes = await axios.get(HEALTH_URL);
        console.log('✅ Health check passou:', healthRes.data);
    } catch (err) {
        console.error('❌ Falha no Health Check:', err.message);
        return; // Aborta testes se API não está de pé
    }

    // 2. Registro de Usuário (Auth)
    try {
        console.log('\n--- 2. Auth - Register ---');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            full_name: 'Usuário de Teste API'
        });
        accessToken = regRes.data.access_token;
        tenantId = regRes.data.tenant_id;
        console.log(`✅ Registro bem sucedido. Email: ${TEST_EMAIL}, Tenant: ${tenantId}`);
    } catch (err) {
        console.error('❌ Falha no Registro:', err.response?.data || err.message);
        return; // Aborta sem token
    }

    // Headers com Auth
    const headers = { 'Authorization': `Bearer ${accessToken}` };

    // 3. Login
    try {
        console.log('\n--- 3. Auth - Login ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        console.log('✅ Login bem sucedido. Acesso validado.');
    } catch (err) {
        console.error('❌ Falha no Login:', err.response?.data || err.message);
    }

    // 4. Perfil do Usuário
    try {
        console.log('\n--- 4. Auth - Me ---');
        const meRes = await axios.get(`${API_URL}/auth/me`, { headers });
        console.log('✅ Busca de perfil passou. Nome:', meRes.data.full_name);
    } catch (err) {
        console.error('❌ Falha na busca de perfil:', err.response?.data || err.message);
    }

    // 5. Bot - Status
    try {
        console.log('\n--- 5. Bot - Status ---');
        const statusRes = await axios.get(`${API_URL}/bot/`, { headers });
        console.log('✅ Status atual do Bot:', statusRes.data.status);
    } catch (err) {
        console.error('❌ Falha ao buscar status do bot:', err.response?.data || err.message);
    }

    // 6. Bot - Start Session
    try {
        console.log('\n--- 6. Bot - Start Session ---');
        const startRes = await axios.post(`${API_URL}/bot/start`, {}, { headers });
        console.log('✅ Sessão Baileys iniciada:', startRes.data.message);
    } catch (err) {
        console.error('❌ Falha ao iniciar bot:', err.response?.data || err.message);
    }

    // Aguarda um momento para o Baileys gerar o QR Code no backend
    console.log('⏳ Aguardando 10 segundos para geração do QR Code pelo Baileys...');
    await delay(10000);

    // 7. Bot - Validação de QR Code (Static Fallback)
    try {
        console.log('\n--- 7. Bot - Obter QR Code (Validação Crucial) ---');
        
        const qrRes = await axios.get(`${API_URL}/bot/qr`, { headers });
        const eventData = qrRes.data;
        
        if (eventData.qrcode) {
            console.log('✅ QR Code em Base64 obtido com sucesso!');
            console.log(`🖼️ Início do Payload Base64: ${eventData.qrcode.substring(0, 50)}...`);
        } else {
            console.log(`ℹ️ Status de conexão: ${eventData.status} (Sem QR Code no momento)`);
        }
        console.log('✅ Teste da rota QR Code concluído com êxito.');
    } catch (err) {
        console.error('❌ Falha na leitura do QR Code:', err.response?.data || err.message);
    }
    
    // 8. Bot - Envio de Mensagem de Texto (Outbound Only Rule)
    try {
        console.log('\n--- 8. Chat - Envio de Mensagem (Texto) ---');
        const sendTextRes = await axios.post(`${API_URL}/chat/send`, {
            to: '5511999999999', // Telefone genérico para teste
            content: 'Olá! Esta é uma mensagem profissional de teste (Texto).',
            type: 'text'
        }, { headers });
        console.log(`✅ Mensagem de texto enviada para a fila! ID: ${sendTextRes.data.message_id}`);
    } catch (err) {
        console.error('❌ Falha ao enviar texto:', err.response?.data || err.message);
    }

    // 9. Bot - Envio de Mensagem de Mídia (Imagem)
    try {
        console.log('\n--- 9. Chat - Envio de Mensagem (Imagem) ---');
        const sendImageRes = await axios.post(`${API_URL}/chat/send`, {
            to: '5511999999999',
            content: 'Confira nossa nova campanha!',
            media_url: 'https://via.placeholder.com/600x400.png',
            type: 'image'
        }, { headers });
        console.log(`✅ Mensagem de imagem enviada para a fila! ID: ${sendImageRes.data.message_id}`);
    } catch (err) {
        console.error('❌ Falha ao enviar imagem:', err.response?.data || err.message);
    }

    // 10. Bot - Cleanup (Stop/Logout)
    try {
        console.log('\n--- 10. Bot - Cleanup (Stop/Logout) ---');
        await axios.post(`${API_URL}/bot/stop`, {}, { headers });
        console.log('✅ Bot finalizado com sucesso.');
    } catch (err) {
         console.log('⚠️ Aviso ao parar o bot:', err.response?.data || err.message);
    }
    
    console.log('\n🎉 Todos os testes de rotas da API foram concluídos.');
}

runTests();
