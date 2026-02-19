const venom = require('venom-bot');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { core: { origin: "*" } });

let venoms = {}; // Map of sessionId -> venom client
let latestQrs = {}; // Map of sessionId -> latest QR code

const axios = require('axios');

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
                // Forward to Channel Gateway Webhook
                await axios.post(`http://saas_channel_gateway:8080/api/webhooks/whatsapp/00000000-0000-0000-0000-000000000001`, {
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

server.listen(4000, () => {
    console.log('Venom Logic Service running on port 4000');
});
