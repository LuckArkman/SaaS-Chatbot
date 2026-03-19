const venom = require('venom-bot');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let venoms = {}; // Map of sessionId -> venom client
let latestQrs = {}; // Map of sessionId -> latest QR code

async function startBot(sessionId) {
    if (venoms[sessionId]) return;

    try {
        console.log(`[*] Starting bot for session: ${sessionId}`);
        const client = await venom.create(
            sessionId,
            (base64Qr, asciiQR, attempts, urlCode) => {
                latestQrs[sessionId] = base64Qr;
                io.emit('qr', { sessionId, qr: base64Qr });
            },
            (statusSession, session) => {
                console.log('Status Session:', statusSession, 'Session name:', session);
                io.emit('status', { sessionId, status: statusSession });
            },
            {
                headless: true,
                sessionDataPath: './tokens',
                browserArgs: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
                createTimeout: 90000,
            }
        );

        venoms[sessionId] = client;

        client.onMessage(async (message) => {
            if (message.isGroupMsg) return;

            console.log(`[${sessionId}] Message from ${message.from}: ${message.body}`);

            try {
                // Forward to Channel Gateway Webhook (Sprint 28 - Python Migration)
                const webhookUrl = process.env.WEBHOOK_URL || 'http://saas_api:8000/api/v1/gateway/webhook/whatsapp';
                await axios.post(webhookUrl, {
                    sessionId,
                    messageId: message.id,
                    content: message.body,
                    senderPhone: message.from,
                    senderName: message.sender.name || message.from
                });
            } catch (err) {
                console.error('Error forwarding message:', err.message);
            }
        });

    } catch (err) {
        console.error('Error starting venom:', err);
        delete venoms[sessionId];
    }
}

// Routes compatible with Evolution API expectations in Python backend
app.post('/instance/create', (req, res) => {
    const { instanceName } = req.body;
    if (!instanceName) return res.status(400).json({ error: "instanceName missing" });
    
    startBot(instanceName);
    res.json({ message: "Initializing", success: True });
});

app.get('/instance/qrcode', (req, res) => {
    const { instance } = req.query;
    if (latestQrs[instance]) {
        res.json({ base64: latestQrs[instance], status: 'Pending' });
    } else {
        res.status(404).json({ error: "QR not ready" });
    }
});

app.get('/instance/connectionState', (req, res) => {
    const { instance } = req.query;
    const client = venoms[instance];
    
    // Simplistic mapping for Python's WhatsAppStatus
    const state = client ? "open" : "close";
    res.json({ instance: { state: state } });
});

app.delete('/instance/logout', async (req, res) => {
    const { instance } = req.query;
    const client = venoms[instance];
    if (client) {
        try {
            await client.logout();
            delete venoms[instance];
            delete latestQrs[instance];
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(404).json({ error: "Instance not found" });
    }
});

// Implementation of Stop and Reboot as requested
app.post('/instance/stop', async (req, res) => {
    const { instance } = req.body;
    const client = venoms[instance];
    if (client) {
        try {
            await client.close();
            delete venoms[instance];
            res.json({ success: true, message: "Instance stopped" });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(404).json({ error: "Instance not found" });
    }
});

app.post('/instance/restart', async (req, res) => {
    const { instance } = req.body;
    const client = venoms[instance];
    if (client) {
        try {
            await client.close();
            delete venoms[instance];
        } catch (e) {}
    }
    startBot(instance);
    res.json({ success: true, message: "Instance restarting" });
});

// Original legacy routes
app.get('/qr/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    if (latestQrs[sessionId]) {
        res.json({ qr: latestQrs[sessionId], status: 'Pending' });
    } else {
        startBot(sessionId);
        res.json({ status: 'Initializing' });
    }
});

app.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    res.json({ status: venoms[sessionId] ? 'Connected' : 'Disconnected' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Venom Logic Service running on port ${PORT}`);
});
