const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let sockets = {};
let latestQrs = {};
let sessionStatuses = {};

const logger = pino({ level: 'info' });

async function connectToWhatsApp(sessionId) {
    if (sockets[sessionId]) return;

    console.log(`[*] Iniciando Baileys para sessão: ${sessionId}`);
    const tokenPath = path.join(__dirname, 'tokens', sessionId);
    if (!fs.existsSync(tokenPath)) {
        fs.mkdirSync(tokenPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(tokenPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: logger.child({ session: sessionId }),
        browser: ["SaaS-OmniChannel", `Tenant-${sessionId}`, "1.0"]
    });

    sockets[sessionId] = sock;
    sessionStatuses[sessionId] = 'CONNECTING';

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${sessionId}] Novo QR Code gerado.`);
            const base64Qr = (await QRCode.toDataURL(qr)).trim();
            latestQrs[sessionId] = base64Qr;
            sessionStatuses[sessionId] = 'QRCODE';
            io.emit('qr', { sessionId, qr: base64Qr });

            console.log(`[${sessionId}] Enviando QR Code para Webhook (${base64Qr.length} chars)`);
            await notifyStatus(sessionId, 'QRCODE', base64Qr);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${sessionId}] Conexão fechada. Motivo: ${lastDisconnect.error}. Reconnect: ${shouldReconnect}`);
            
            delete sockets[sessionId];
            delete latestQrs[sessionId];
            sessionStatuses[sessionId] = 'DISCONNECTED';

            await notifyStatus(sessionId, 'DISCONNECTED');

            if (shouldReconnect) {
                connectToWhatsApp(sessionId);
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] Conexão estabelecida com sucesso!`);
            sessionStatuses[sessionId] = 'CONNECTED';
            delete latestQrs[sessionId];
            io.emit('status', { sessionId, status: 'CONNECTED' });
            
            await notifyStatus(sessionId, 'CONNECTED');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe && msg.message) {
                    try {
                        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
                        const webhookUrl = process.env.WEBHOOK_URL || 'http://127.0.0.1:8001/api/v1/gateway/webhook/whatsapp';
                        const headers = { 'x-api-key': 'SaaS_Secret_Gateway_Key_2026' };
                        
                        await axios.post(webhookUrl, {
                            sessionId,
                            messageId: msg.key.id,
                            content: content,
                            senderPhone: msg.key.remoteJid,
                            senderName: msg.pushName || msg.key.remoteJid
                        }, { headers });
                    } catch (err) {
                        console.error(`[${sessionId}] Erro ao encaminhar para webhook:`, err.message);
                    }
                }
            }
        }
    });
}

// Helper para notificação de status unificada
async function notifyStatus(sessionId, state, qrcode = null) {
    const webhookUrl = process.env.WEBHOOK_URL || 'http://127.0.0.1:8001/api/v1/gateway/webhook/whatsapp';
    const headers = { 'x-api-key': 'SaaS_Secret_Gateway_Key_2026' };
    
    try {
        await axios.post(webhookUrl, {
            event: 'on_state_change',
            session: sessionId,
            payload: {
                state: state,
                qrcode: qrcode
            }
        }, { headers });
    } catch (e) {
        console.error(`[${sessionId}] Erro ao notificar status (${state}) no webhook:`, e.message);
    }
}

// --- Bridge Endpoints ---

app.post('/instance/create', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId missing' });
    
    if (sockets[sessionId]) {
        return res.json({ success: true, state: sessionStatuses[sessionId] });
    }

    connectToWhatsApp(sessionId).catch(e => console.error(e));
    res.status(202).json({ success: true, state: 'CONNECTING' });
});

app.post('/instance/stop', async (req, res) => {
    const { sessionId } = req.body;
    const sock = sockets[sessionId];
    if (sock) {
        sock.logout(); 
        delete sockets[sessionId];
        delete latestQrs[sessionId];
        sessionStatuses[sessionId] = 'DISCONNECTED';
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Instance not found" });
    }
});

app.post('/instance/restart', async (req, res) => {
    const { sessionId } = req.body;
    if (sockets[sessionId]) {
        try { sockets[sessionId].end(); } catch (e) {}
        delete sockets[sessionId];
    }
    connectToWhatsApp(sessionId).catch(e => console.error(e));
    res.json({ success: true, state: 'RESTARTING' });
});

app.get('/instance/qrcode', (req, res) => {
    const { sessionId } = req.query;
    if (latestQrs[sessionId]) {
        res.json({ qrcode: latestQrs[sessionId], state: 'QRCODE' });
    } else {
        res.status(404).json({ error: "QR not ready" });
    }
});

app.get('/instance/connectionState', (req, res) => {
    const { sessionId } = req.query;
    const status = sessionStatuses[sessionId] || 'DISCONNECTED';
    res.json({ state: status });
});

// --- Contacts Endpoints ---

/**
 * POST /contacts/add
 * Body: { sessionId, phone, name? }
 * Verifica se o número existe no WhatsApp e retorna seus dados.
 * No WhatsApp, "adicionar" um contato é validar sua existência via onWhatsApp().
 * O nome/apelido é gerenciado pelo cliente (front-end / banco Python).
 */
app.post('/contacts/add', async (req, res) => {
    const { sessionId, phone, name } = req.body;

    if (!sessionId || !phone) {
        return res.status(400).json({ error: 'sessionId e phone são obrigatórios' });
    }

    const sock = sockets[sessionId];
    if (!sock) {
        return res.status(404).json({ error: `Instância '${sessionId}' não encontrada ou desconectada.` });
    }

    if (sessionStatuses[sessionId] !== 'CONNECTED') {
        return res.status(409).json({
            error: 'Instância não está conectada.',
            state: sessionStatuses[sessionId]
        });
    }

    try {
        // Normaliza o número: remove espaços, traços e parênteses
        const normalizedPhone = phone.replace(/[^0-9+]/g, '');
        const jid = normalizedPhone.includes('@') ? normalizedPhone : `${normalizedPhone}@s.whatsapp.net`;

        // Verifica existência real do número no WhatsApp
        const [result] = await sock.onWhatsApp(jid.replace('@s.whatsapp.net', ''));

        if (!result || !result.exists) {
            return res.status(422).json({
                success: false,
                error: `O número ${phone} não possui uma conta WhatsApp ativa.`
            });
        }

        console.log(`[${sessionId}] Contato verificado/adicionado: ${result.jid} (Nome fornecido: ${name || 'N/A'})`);

        return res.json({
            success: true,
            contact: {
                jid: result.jid,
                phone: normalizedPhone,
                name: name || null,
                verified: true
            }
        });
    } catch (err) {
        console.error(`[${sessionId}] Erro ao verificar contato ${phone}:`, err.message);
        return res.status(500).json({ error: 'Erro interno ao verificar o contato no WhatsApp.', detail: err.message });
    }
});

/**
 * GET /contacts/list
 * Query: { sessionId }
 * Retorna a lista completa de contatos do WhatsApp carregada pela sessão Baileys.
 * A lista inclui todos os participantes de conversas já abertas pelo usuário.
 */
app.get('/contacts/list', async (req, res) => {
    const { sessionId } = req.query;

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId é obrigatório' });
    }

    const sock = sockets[sessionId];
    if (!sock) {
        return res.status(404).json({ error: `Instância '${sessionId}' não encontrada ou desconectada.` });
    }

    if (sessionStatuses[sessionId] !== 'CONNECTED') {
        return res.status(409).json({
            error: 'Instância não está conectada.',
            state: sessionStatuses[sessionId]
        });
    }

    try {
        // Baileys armazena contatos no store interno da sessão
        // sock.store?.contacts retorna o cache de contatos conhecidos
        const rawContacts = sock.store?.contacts || {};

        const contacts = Object.entries(rawContacts)
            .filter(([jid]) => jid.endsWith('@s.whatsapp.net')) // exclui grupos
            .map(([jid, contact]) => ({
                jid,
                phone: jid.replace('@s.whatsapp.net', ''),
                name: contact.name || contact.notify || null,
                short_name: contact.short || null
            }));

        console.log(`[${sessionId}] Lista de contatos solicitada: ${contacts.length} contato(s) encontrado(s).`);

        return res.json({
            success: true,
            total: contacts.length,
            contacts
        });
    } catch (err) {
        console.error(`[${sessionId}] Erro ao listar contatos:`, err.message);
        return res.status(500).json({ error: 'Erro interno ao listar contatos.', detail: err.message });
    }
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Bridge (Baileys) listening on port ${PORT}`);
});
