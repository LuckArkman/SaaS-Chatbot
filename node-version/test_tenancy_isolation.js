const axios = require('axios');

const API_URL = 'http://localhost:8001/api/v1';

async function runTenancyTest() {
    console.log('🛡️ Iniciando Teste de Isolamento Multi-Tenancy (Tenant A vs Tenant B)\n');

    const emailA = `tenant_A_${Date.now()}@test.com`;
    const emailB = `tenant_B_${Date.now()}@test.com`;
    const password = 'Password123!';

    try {
        // 1. Criar Tenant A
        console.log(`--- Registrando Tenant A (${emailA}) ---`);
        const regA = await axios.post(`${API_URL}/auth/register`, {
            full_name: 'Empresa A',
            email: emailA,
            password: password,
            phone: '5511900000001'
        });
        const tenant_A_id = regA.data.tenant_id;
        console.log(`✅ Tenant A criado! ID: ${tenant_A_id}\n`);
        
        const loginA = await axios.post(`${API_URL}/auth/login`, { email: emailA, password: password });
        const token_A = loginA.data.access_token;
        const headersA = { Authorization: `Bearer ${token_A}` };

        // 2. Criar Tenant B
        console.log(`--- Registrando Tenant B (${emailB}) ---`);
        const regB = await axios.post(`${API_URL}/auth/register`, {
            full_name: 'Empresa B',
            email: emailB,
            password: password,
            phone: '5511900000002'
        });
        const tenant_B_id = regB.data.tenant_id;
        console.log(`✅ Tenant B criado! ID: ${tenant_B_id}\n`);

        const loginB = await axios.post(`${API_URL}/auth/login`, { email: emailB, password: password });
        const token_B = loginB.data.access_token;
        const headersB = { Authorization: `Bearer ${token_B}` };

        // 3. Garantir que as sessões de Bot são únicas
        console.log(`--- Verificando Sessões do Bot (Isolamento de WhatsApp) ---`);
        
        await axios.post(`${API_URL}/bot/start`, {}, { headers: headersA });
        const botA = await axios.get(`${API_URL}/bot/`, { headers: headersA });
        console.log(`🤖 Bot Tenant A -> Sessão: ${botA.data.session_name}`);

        await axios.post(`${API_URL}/bot/start`, {}, { headers: headersB });
        const botB = await axios.get(`${API_URL}/bot/`, { headers: headersB });
        console.log(`🤖 Bot Tenant B -> Sessão: ${botB.data.session_name}`);

        if (botA.data.session_name === botB.data.session_name) {
            throw new Error('As sessões do WhatsApp não estão isoladas!');
        } else {
            console.log('✅ Isolamento de Sessão de WhatsApp Confirmado (Nomes Únicos).\n');
        }

        // 4. Enviar Mensagens
        console.log(`--- Enviando Mensagem pelo Tenant A ---`);
        const msgA = await axios.post(`${API_URL}/chat/send`, {
            to: '5511999999999',
            content: 'Mensagem confidencial do Tenant A',
            type: 'text'
        }, { headers: headersA });
        console.log(`📤 Mensagem enviada via Tenant A (ID: ${msgA.data.message_id})`);

        console.log(`--- Enviando Mensagem pelo Tenant B ---`);
        const msgB = await axios.post(`${API_URL}/chat/send`, {
            to: '5511999999999',
            content: 'Mensagem confidencial do Tenant B',
            type: 'text'
        }, { headers: headersB });
        console.log(`📤 Mensagem enviada via Tenant B (ID: ${msgB.data.message_id})\n`);

        // 5. Verificar cruzamento de dados (Histórico)
        console.log(`--- Verificando Isolamento do Banco de Dados ---`);
        
        const historyA = await axios.get(`${API_URL}/chat/history/5511999999999?sync=false`, { headers: headersA });
        const historyB = await axios.get(`${API_URL}/chat/history/5511999999999?sync=false`, { headers: headersB });

        console.log(`📥 Histórico do Tenant A possui ${historyA.data.data.length} mensagens com este número.`);
        const containsMsgFromB = historyA.data.data.some(m => m.content === 'Mensagem confidencial do Tenant B');
        
        console.log(`📥 Histórico do Tenant B possui ${historyB.data.data.length} mensagens com este número.`);
        const containsMsgFromA = historyB.data.data.some(m => m.content === 'Mensagem confidencial do Tenant A');

        if (containsMsgFromB || containsMsgFromA) {
            throw new Error('Vazamento de dados! Um tenant consegue ler mensagens do outro.');
        } else {
            console.log('✅ Nenhum cruzamento de dados detectado! O Tenant A só enxerga as mensagens A, e B só as B.\n');
        }

        // Cleanup
        await axios.post(`${API_URL}/bot/stop`, {}, { headers: headersA });
        await axios.post(`${API_URL}/bot/stop`, {}, { headers: headersB });

        console.log('🎉 TESTE BEM SUCEDIDO: O Isolamento Multi-Tenancy (Data & WhatsApp) é 100% Hermético.');

    } catch (err) {
        console.error('❌ Falha no Teste:', err.response?.data || err.message);
    }
}

runTenancyTest();
