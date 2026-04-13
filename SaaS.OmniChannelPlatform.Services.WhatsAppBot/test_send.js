/**
 * test_send.js — Script de teste de envio WhatsApp via Bridge
 * Uso: node test_send.js <sessionId> <phoneNumber> [mensagem]
 *
 * Exemplo:
 *   node test_send.js tenant_A0BC60D4_9a6c193c 5562982424441 "Teste de mensagem"
 */

const http = require('http');

const SESSION_ID = process.argv[2] || 'tenant_A0BC60D4_9a6c193c';
const PHONE      = process.argv[3] || '5562982424441';
const MESSAGE    = process.argv[4] || 'Mensagem de teste do sistema SaaS';
const BASE_URL   = 'http://127.0.0.1:4000';

function httpPost(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname: '127.0.0.1',
            port: 4000,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = http.request(opts, (res) => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
                catch(e) { resolve({ status: res.statusCode, body: buf }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function httpGet(path) {
    return new Promise((resolve, reject) => {
        http.get({ hostname: '127.0.0.1', port: 4000, path }, (res) => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
                catch(e) { resolve({ status: res.statusCode, body: buf }); }
            });
        }).on('error', reject);
    });
}

async function waitForConnected(sessionId, maxWaitMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        const r = await httpGet(`/instance/connectionState?sessionId=${sessionId}`);
        const state = r.body?.state || 'UNKNOWN';
        console.log(`  [${new Date().toISOString()}] Estado: ${state}`);
        if (state === 'CONNECTED') return true;
        if (state === 'QRCODE') {
            console.log('  ⚠️  Sessão precisa de QR Code — tokens inválidos ou sessão nova.');
            return false;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return false;
}

async function main() {
    console.log(`\n🔬 TESTE DE ENVIO — Bridge WhatsApp`);
    console.log(`   Sessão  : ${SESSION_ID}`);
    console.log(`   Destino : ${PHONE}`);
    console.log(`   Mensagem: "${MESSAGE}"\n`);

    // 1. Verificar estado atual
    console.log('1️⃣  Verificando estado da sessão...');
    const stateRes = await httpGet(`/instance/connectionState?sessionId=${SESSION_ID}`);
    console.log(`   Estado atual: ${stateRes.body?.state}`);

    // 2. Se não conectado, tenta iniciar
    if (stateRes.body?.state !== 'CONNECTED') {
        console.log('\n2️⃣  Sessão não conectada. Iniciando...');
        const createRes = await httpPost('/instance/create', { sessionId: SESSION_ID });
        console.log(`   Resposta create: ${JSON.stringify(createRes.body)}`);

        console.log('\n3️⃣  Aguardando conexão (até 30s)...');
        const connected = await waitForConnected(SESSION_ID, 30000);

        if (!connected) {
            console.log('\n❌ Sessão não conectou em 30s. Verifique logs do Bridge.');
            console.log('   docker logs saas_whatsapp_bridge --tail 50');
            process.exit(1);
        }
    } else {
        console.log('   ✅ Sessão já conectada!');
    }

    // 3. Enviar mensagem
    console.log(`\n4️⃣  Enviando mensagem para ${PHONE}...`);
    const sendRes = await httpPost('/instance/sendMessage', {
        sessionId: SESSION_ID,
        to: PHONE,
        content: MESSAGE
    });

    console.log(`\n📊 RESULTADO DO ENVIO:`);
    console.log(`   HTTP Status : ${sendRes.status}`);
    console.log(`   Resposta    : ${JSON.stringify(sendRes.body, null, 2)}`);

    if (sendRes.status === 200 && sendRes.body?.success) {
        console.log(`\n✅ SUCESSO — Mensagem enviada! ID: ${sendRes.body?.messageId}`);
        console.log(`   JID destino : ${sendRes.body?.to}`);
        console.log(`   Aguarde ACK ENTREGUE nos logs do Bridge para confirmar entrega real.`);
    } else {
        console.log(`\n❌ FALHA NO ENVIO`);
        console.log(`   Erro: ${sendRes.body?.error || 'Desconhecido'}`);
        console.log(`   Detalhe: ${sendRes.body?.detail || 'N/A'}`);
    }
}

main().catch(e => {
    console.error('❌ Erro inesperado:', e.message);
    process.exit(1);
});
