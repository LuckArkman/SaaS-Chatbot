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
app.use(express.json());
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
        browser: ["SaaS-OmniChannel", "Chrome", "1.0"]
    });

    sockets[sessionId] = sock;
    sessionStatuses[sessionId] = 'CONNECTING';

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${sessionId}] Novo QR Code gerado.`);
            const base64Qr = await QRCode.toDataURL(qr);
            latestQrs[sessionId] = base64Qr;
            sessionStatuses[sessionId] = 'QRCODE';
            io.emit('qr', { sessionId, qr: base64Qr });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${sessionId}] Conexão fechada. Motivo: ${lastDisconnect.error}. Reconnect: ${shouldReconnect}`);
            
            delete sockets[sessionId];
            delete latestQrs[sessionId];
            sessionStatuses[sessionId] = 'DISCONNECTED';

            if (shouldReconnect) {
                connectToWhatsApp(sessionId);
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] Conexão estabelecida com sucesso!`);
            sessionStatuses[sessionId] = 'CONNECTED';
            delete latestQrs[sessionId];
            io.emit('status', { sessionId, status: 'CONNECTED' });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe && msg.message) {
                    try {
                        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
                        const webhookUrl = process.env.WEBHOOK_URL || 'http://saas_api:8000/api/v1/gateway/webhook/whatsapp';
                        
                        await axios.post(webhookUrl, {
                            sessionId,
                            messageId: msg.key.id,
                            content: content,
                            senderPhone: msg.key.remoteJid,
                            senderName: msg.pushName || msg.key.remoteJid
                        });
                    } catch (err) {
                        console.error(`[${sessionId}] Erro ao encaminhar para webhook:`, err.message);
                    }
                }
            }
        }
    });
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

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Bridge (Baileys) listening on port ${PORT}`);
});
