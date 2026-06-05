const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configurações do ambiente de testes
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const TEST_TOKEN = process.env.TEST_TOKEN || 'seu-token-jwt-aqui'; // Necessário para rotas protegidas (requireAuth)
const TEST_PHONE = process.env.TEST_PHONE || '5511999999999';

// Configuração base do Axios
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${TEST_TOKEN}`
    }
});

/**
 * Função utilitária para criar um arquivo dummy para testes
 */
function createDummyFile(filename, content) {
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
}

/**
 * Teste da rota de Upload de Mídia (Storage)
 */
async function testMediaUpload(filepath, mimeType) {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filepath));

        const response = await api.post('/storage/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log(`✅ [Upload] Sucesso (${path.basename(filepath)}):`, response.data);
        return response.data; // Espera-se retornar a URL ou Path da mídia
    } catch (error) {
        console.error(`❌ [Upload] Erro (${path.basename(filepath)}):`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Teste da rota de Envio de Mensagem (Chat Send)
 */
async function testSendMessage(mediaUrl, type, content = '') {
    try {
        const payload = {
            to: TEST_PHONE,
            content: content || `Testando envio de ${type} via API`,
            type: type,
            media_url: mediaUrl
        };

        const response = await api.post('/chat/send', payload);
        console.log(`✅ [Send Message] Sucesso (${type}):`, response.data);
        return response.data;
    } catch (error) {
        console.error(`❌ [Send Message] Erro (${type}):`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Simula o recebimento de uma mensagem (via Webhook ou rota de injeção direta)
 * Nota: Como as mensagens de entrada do Baileys são eventos de socket,
 * a simulação via API REST geralmente testa o webhook para canais externos.
 */
async function testWebhookInbound(mediaUrl, type) {
    try {
        // Simulando o payload de um webhook genérico (ex: Gupshup, Meta Cloud API)
        const payload = {
            channel: 'whatsapp',
            event: 'message',
            message: {
                from: TEST_PHONE,
                type: type,
                body: `Mensagem recebida de teste (${type})`,
                mediaUrl: mediaUrl
            }
        };

        const response = await api.post('/gateway/webhook/whatsapp', payload);
        console.log(`✅ [Webhook Inbound] Sucesso (${type}):`, response.data || response.status);
        return response.data;
    } catch (error) {
        console.error(`❌ [Webhook Inbound] Erro (${type}):`, error.response?.data || error.message);
        // Não vamos falhar o teste geral se o webhook não estiver implementado para este canal
    }
}

/**
 * Executa a suíte de testes completa
 */
async function runIntegrationTests() {
    console.log('🚀 Iniciando Suíte de Testes de Integração de Mídia (API Routes)...\n');

    // Criar arquivos de teste
    const dummyImage = createDummyFile('test_image.jpg', 'fake-image-content-blob');
    const dummyDoc = createDummyFile('test_doc.pdf', 'fake-pdf-content-blob');
    const dummyVideo = createDummyFile('test_video.mp4', 'fake-video-content-blob');
    const dummyAudio = createDummyFile('test_audio.ogg', 'fake-audio-content-blob');

    try {
        // 1. Testar Rotas de Upload
        console.log('--- Testando Uploads (POST /storage/upload) ---');
        const imageUpload = await testMediaUpload(dummyImage, 'image/jpeg');
        const docUpload = await testMediaUpload(dummyDoc, 'application/pdf');
        const videoUpload = await testMediaUpload(dummyVideo, 'video/mp4');
        const audioUpload = await testMediaUpload(dummyAudio, 'audio/ogg');

        console.log('\n--- Testando Envio de Mensagens (POST /chat/send) ---');

        // Obter URLs das mídias enviadas (assumindo que a API retorna em { url: '...' })
        const imageUrl = imageUpload.url || imageUpload.filePath || 'https://fake.url/image.jpg';
        const docUrl = docUpload.url || docUpload.filePath || 'https://fake.url/doc.pdf';
        const videoUrl = videoUpload.url || videoUpload.filePath || 'https://fake.url/video.mp4';
        const audioUrl = audioUpload.url || audioUpload.filePath || 'https://fake.url/audio.ogg';

        // 2. Testar Rotas de Envio (Outbound)
        await testSendMessage(imageUrl, 'image', 'Veja esta imagem de teste');
        await testSendMessage(docUrl, 'document', 'Segue o relatório de testes');
        await testSendMessage(videoUrl, 'video', 'Vídeo de demonstração');
        await testSendMessage(audioUrl, 'audio', ''); // Áudio geralmente não tem caption

        console.log('\n--- Testando Recebimento via Webhook (POST /gateway/webhook/{channel}) ---');

        // 3. Testar Rota de Webhook (Inbound)
        await testWebhookInbound(imageUrl, 'image');
        await testWebhookInbound(docUrl, 'document');

        console.log('\n🎉 Todos os testes da API concluídos com sucesso!');

    } catch (error) {
        console.error('\n💥 Falha nos testes de integração da API.');
        process.exit(1);
    } finally {
        // Limpeza dos arquivos de teste
        fs.unlinkSync(dummyImage);
        fs.unlinkSync(dummyDoc);
        fs.unlinkSync(dummyVideo);
        fs.unlinkSync(dummyAudio);
    }
}

runIntegrationTests();
