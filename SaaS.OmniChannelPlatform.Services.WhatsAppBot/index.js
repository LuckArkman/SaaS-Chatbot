const venom = require('venom-bot');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let venoms = {}; // Map of sessionId -> venom client
let latestQrs = {}; // Map of sessionId -> latest QR code

async function startBot(sessionId) {
    if (venoms[sessionId]) return;

    try {
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
                headless: 'new',
                sessionDataPath: './tokens',
                browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
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
    }
}

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
server.listen(PORT, () => {
    console.log(`Venom Logic Service running on port ${PORT}`);
});
