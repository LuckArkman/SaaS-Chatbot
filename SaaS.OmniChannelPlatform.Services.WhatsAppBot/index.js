const venom = require('venom-bot');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let venoms = {}; // Map of sessionId -> venom client
let latestQrs = {}; // Map of sessionId -> latest QR code
let sessionStatuses = {}; // Map of sessionId -> status string

async function startBot(sessionId) {
    if (venoms[sessionId]) return;
    
    sessionStatuses[sessionId] = 'CONNECTING';

    try {
        console.log(`[*] Starting bot for session: ${sessionId}`);
        const tokenPath = path.join(__dirname, 'tokens', sessionId);
        
        if (!fs.existsSync(tokenPath)) {
            fs.mkdirSync(tokenPath, { recursive: true });
        }

        const lockPath = path.join(tokenPath, 'SingletonLock');
        if (fs.existsSync(lockPath)) {
            console.log(`[!] Removing existing SingletonLock for ${sessionId}`);
            try { fs.unlinkSync(lockPath); } catch (e) {}
        }

        const client = await venom.create(
            sessionId,
            (base64Qr) => {
                latestQrs[sessionId] = base64Qr;
                sessionStatuses[sessionId] = 'QRCODE';
                io.emit('qr', { sessionId, qr: base64Qr });
            },
            (statusSession) => {
                console.log(`[${sessionId}] Status: ${statusSession}`);
                sessionStatuses[sessionId] = statusSession.toUpperCase();
                io.emit('status', { sessionId, status: statusSession });
            },
            {
                headless: true,
                sessionDataPath: './tokens',
                browserArgs: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
                createTimeout: 60000,
            }
        );

        venoms[sessionId] = client;
        sessionStatuses[sessionId] = 'CONNECTED';

        client.onMessage(async (message) => {
            if (message.isGroupMsg) return;
            try {
                const webhookUrl = process.env.WEBHOOK_URL || 'http://saas_api:8000/api/v1/gateway/webhook/whatsapp';
                await axios.post(webhookUrl, {
                    sessionId,
                    messageId: message.id,
                    content: message.body,
                    senderPhone: message.from,
                    senderName: message.sender.name || message.from
                });
            } catch (err) {
                console.error(`[${sessionId}] Error forwarding message:`, err.message);
            }
        });

    } catch (err) {
        console.error(`[${sessionId}] Error starting venom:`, err);
        delete venoms[sessionId];
        sessionStatuses[sessionId] = 'DISCONNECTED';
    }
}

// --- Bridge Endpoints ---

app.post('/instance/create', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId missing' });
    
    if (!venoms[sessionId]) {
        console.log(`[HTTP] Creating session: ${sessionId}`);
        startBot(sessionId).catch(e => console.error(e));
    }
    res.status(202).json({ success: true, state: 'CONNECTING' });
});

app.post('/instance/stop', async (req, res) => {
    const { sessionId } = req.body;
    const client = venoms[sessionId];
    if (client) {
        try {
            await client.close();
            delete venoms[sessionId];
            delete latestQrs[sessionId];
            sessionStatuses[sessionId] = 'DISCONNECTED';
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(404).json({ error: "Instance not found" });
    }
});

app.post('/instance/restart', async (req, res) => {
    const { sessionId } = req.body;
    if (venoms[sessionId]) {
        try { await venoms[sessionId].close(); } catch (e) {}
        delete venoms[sessionId];
    }
    startBot(sessionId).catch(e => console.error(e));
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

app.post('/instance/logout', async (req, res) => {
    const { sessionId } = req.body;
    const client = venoms[sessionId];
    if (client) {
        try {
            await client.logout();
            delete venoms[sessionId];
            sessionStatuses[sessionId] = 'DISCONNECTED';
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(404).json({ error: "Instance not found" });
    }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Bridge (Venom) listening on port ${PORT}`);
});
