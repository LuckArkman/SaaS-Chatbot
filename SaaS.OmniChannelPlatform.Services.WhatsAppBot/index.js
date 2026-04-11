/**
 * index.js — Orquestrador Multi-Thread do Baileys Bridge
 * 
 * Arquitetura:
 *   ┌──────────────────────────────────────────────────┐
 *   │  Express HTTP (Thread Principal)                  │
 *   │  Recebe requisições do Python e redireciona       │
 *   │  para o Worker Thread do tenant correto.          │
 *   │                                                   │
 *   │  ┌──────────────┐  ┌──────────────┐              │
 *   │  │ Worker       │  │ Worker       │  ...          │
 *   │  │ tenant_abc   │  │ tenant_xyz   │              │
 *   │  │ (Baileys)    │  │ (Baileys)    │              │
 *   │  │ Thread 1     │  │ Thread 2     │              │
 *   │  └──────────────┘  └──────────────┘              │
 *   └──────────────────────────────────────────────────┘
 * 
 * Cada Worker Thread contém:
 *   - Socket Baileys próprio
 *   - Manual Store (mensagens/chats/contatos) privado
 *   - WebhookQueue FIFO isolada
 *   - Sem variáveis globais compartilhadas
 * 
 * Comunicação: postMessage (thread principal ⇄ workers)
 */

'use strict';

const { Worker } = require('worker_threads');
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const crypto     = require('crypto');

const app    = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

const WORKER_SCRIPT  = path.join(__dirname, 'session-worker.js');
const WEBHOOK_URL    = process.env.WEBHOOK_URL || 'http://127.0.0.1:8001/api/v1/gateway/webhook/whatsapp';
const GATEWAY_API_KEY = 'SaaS_Secret_Gateway_Key_2026';
const PORT           = 4000;

// ─────────────────────────────────────────────────────────────────────────────
// Registro de Workers ativos: sessionId → { worker, pendingReplies }
// ─────────────────────────────────────────────────────────────────────────────
const workers = {};  // sessionId → Worker instance
const pending = {};  // reqId    → { resolve, reject, timer }

/**
 * Cria e inicializa um Worker Thread para um dado sessionId.
 * Idempotente: retorna o worker existente se já em execução.
 */
function getOrCreateWorker(sessionId) {
    if (workers[sessionId]) return workers[sessionId];

    console.log(`[Orquestrador] 🧵 Criando Worker Thread para sessão: ${sessionId}`);

    const worker = new Worker(WORKER_SCRIPT, {
        workerData: {
            sessionId,
            webhookUrl: WEBHOOK_URL,
            apiKey:     GATEWAY_API_KEY
        }
    });

    // ── Tratamento de mensagens do Worker ─────────────────────────────────
    worker.on('message', (msg) => {
        if (msg.type === 'REPLY') {
            // Resolve a Promise que estava aguardando esta resposta
            const promise = pending[msg.reqId];
            if (promise) {
                clearTimeout(promise.timer);
                delete pending[msg.reqId];
                msg.success ? promise.resolve(msg) : promise.reject(new Error(msg.error));
            }

        } else if (msg.type === 'EVENT') {
            // Eventos de status emitidos pelo Baileys (QR, conectado, etc)
            const { event, payload } = msg;

            if (event === 'state_change') {
                const state = payload.state;
                console.log(`[${sessionId}] 📡 Estado: ${state}`);
                io.emit('status', { sessionId, status: state });

                if (state === 'QRCODE' && payload.qrcode) {
                    io.emit('qr', { sessionId, qr: payload.qrcode });
                }
            }
        }
    });

    worker.on('error', (err) => {
        console.error(`[${sessionId}] ❌ Worker error: ${err.message}`);
    });

    worker.on('exit', (code) => {
        console.log(`[${sessionId}] 🛑 Worker encerrado (código: ${code}). Removendo registro.`);
        // Limpa promises pendentes deste worker
        for (const [reqId, p] of Object.entries(pending)) {
            if (p.sessionId === sessionId) {
                clearTimeout(p.timer);
                p.reject(new Error('Worker encerrado inesperadamente.'));
                delete pending[reqId];
            }
        }
        delete workers[sessionId];
    });

    workers[sessionId] = worker;
    return worker;
}

/**
 * Envia um comando ao Worker e aguarda a resposta (Promise com timeout de 30s).
 */
function sendToWorker(sessionId, command) {
    return new Promise((resolve, reject) => {
        const reqId  = crypto.randomBytes(6).toString('hex');
        const worker = workers[sessionId];

        if (!worker) {
            return reject(new Error(`Worker para '${sessionId}' não encontrado.`));
        }

        const timer = setTimeout(() => {
            delete pending[reqId];
            reject(new Error(`Timeout aguardando resposta do worker '${sessionId}' para '${command.type}'.`));
        }, 30000);

        pending[reqId] = { resolve, reject, timer, sessionId };
        worker.postMessage({ ...command, reqId });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware de validação de sessionId
// ─────────────────────────────────────────────────────────────────────────────
function requireWorker(getSessionId) {
    return (req, res, next) => {
        const sessionId = getSessionId(req);
        if (!sessionId) return res.status(400).json({ error: 'sessionId obrigatório.' });
        if (!workers[sessionId]) return res.status(404).json({
            error: `Instância '${sessionId}' não encontrada.`,
            active_sessions: Object.keys(workers)
        });
        req.sessionId = sessionId;
        next();
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotas HTTP — Idênticas à API anterior, agora delegam a Workers
// ─────────────────────────────────────────────────────────────────────────────

/** POST /instance/create — Cria/inicia a thread do tenant */
app.post('/instance/create', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId missing' });

    if (workers[sessionId]) {
        try {
            const status = await sendToWorker(sessionId, { type: 'GET_STATUS' });
            return res.json({ success: true, state: status.data.state });
        } catch (_) {
            return res.json({ success: true, state: 'CONNECTING' });
        }
    }

    getOrCreateWorker(sessionId);
    res.status(202).json({ success: true, state: 'CONNECTING' });
});

/** POST /instance/stop — Para e destrói o Worker do tenant */
app.post('/instance/stop', requireWorker(r => r.body.sessionId), async (req, res) => {
    try {
        await sendToWorker(req.sessionId, { type: 'STOP' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/** POST /instance/restart — Para e recria o Worker do tenant */
app.post('/instance/restart', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId missing' });

    if (workers[sessionId]) {
        try { await sendToWorker(sessionId, { type: 'STOP' }); } catch (_) {}
        // Aguarda o worker terminar (o evento 'exit' vai deletar workers[sessionId])
        await new Promise(r => setTimeout(r, 500));
    }

    getOrCreateWorker(sessionId);
    res.json({ success: true, state: 'RESTARTING' });
});

/** GET /instance/qrcode — Retorna o QR Code atual */
app.get('/instance/qrcode', requireWorker(r => r.query.sessionId), async (req, res) => {
    try {
        const reply = await sendToWorker(req.sessionId, { type: 'GET_QRCODE' });
        res.json({ qrcode: reply.data.qrcode, state: 'QRCODE' });
    } catch (e) {
        res.status(404).json({ error: e.message });
    }
});

/** GET /instance/connectionState — Retorna status da conexão */
app.get('/instance/connectionState', async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId obrigatório.' });

    if (!workers[sessionId]) return res.json({ state: 'DISCONNECTED' });

    try {
        const reply = await sendToWorker(sessionId, { type: 'GET_STATUS' });
        res.json({ state: reply.data.state });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/** POST /instance/sendMessage — Envia mensagem via Worker */
app.post('/instance/sendMessage', requireWorker(r => r.body.sessionId), async (req, res) => {
    const { to, content } = req.body;
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    console.log(`\n[${req.sessionId}][REQ:${reqId}] ── SEND MESSAGE ──`);
    console.log(`[${req.sessionId}][REQ:${reqId}] to='${to}' | len=${content?.length ?? 0}`);

    if (!to || !content) {
        return res.status(400).json({ error: 'Campos obrigatórios: to, content' });
    }

    try {
        const reply = await sendToWorker(req.sessionId, { type: 'SEND_MESSAGE', to, content, reqId });
        console.log(`[${req.sessionId}][REQ:${reqId}] ✅ Enviado | ID: ${reply.data.message_id}`);
        res.json({ success: true, message_id: reply.data.message_id, jid: reply.data.jid });
    } catch (e) {
        console.error(`[${req.sessionId}][REQ:${reqId}] ❌ Falha: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

/** GET /instance/chats — Lista conversas */
app.get('/instance/chats', requireWorker(r => r.query.sessionId), async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;
    try {
        const reply = await sendToWorker(req.sessionId, { type: 'GET_CHATS', limit });
        res.json({ success: true, ...reply.data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/** GET /instance/chat-history — Histórico de mensagens de um JID */
app.get('/instance/chat-history', requireWorker(r => r.query.sessionId), async (req, res) => {
    const { jid, limit = 50 } = req.query;
    if (!jid) return res.status(400).json({ error: 'jid obrigatório.' });

    try {
        const reply = await sendToWorker(req.sessionId, {
            type: 'GET_HISTORY',
            jid,
            limit: Math.min(parseInt(limit, 10) || 50, 200)
        });
        res.json({ success: true, ...reply.data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/** GET /contacts/list — Lista contatos */
app.get('/contacts/list', requireWorker(r => r.query.sessionId), async (req, res) => {
    try {
        const reply = await sendToWorker(req.sessionId, { type: 'GET_CONTACTS' });
        res.json({ success: true, ...reply.data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/** POST /contacts/add — Verifica se o número tem WhatsApp */
app.post('/contacts/add', requireWorker(r => r.body.sessionId), async (req, res) => {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone obrigatório.' });

    try {
        const reply = await sendToWorker(req.sessionId, { type: 'VERIFY_CONTACT', phone });
        res.json({ success: true, ...reply.data });
    } catch (e) {
        res.status(422).json({ success: false, error: e.message });
    }
});

/** PUT /contacts/edit — Edita nome no cache local do worker */
app.put('/contacts/edit', requireWorker(r => r.body.sessionId), async (req, res) => {
    // Operação de cache: não precisa ir ao Worker (o store é imutável por thread).
    // O nome é gerenciado pelo Python/Postgres; aqui retornamos sucesso diretamente.
    const { phone, name } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'phone e name obrigatórios.' });
    res.json({ success: true, contact: { phone, name } });
});

/** DELETE /contacts/delete — Remove contato do cache */
app.delete('/contacts/delete', requireWorker(r => r.body.sessionId), async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone obrigatório.' });
    res.json({ success: true, message: 'Contato removido do cache.', phone });
});

// ─────────────────────────────────────────────────────────────────────────────
// Health check e status global
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
    res.json({
        status: 'ok',
        active_sessions: Object.keys(workers),
        worker_count:    Object.keys(workers).length
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Graceful Shutdown — Encerra todos os workers ao parar o processo
// ─────────────────────────────────────────────────────────────────────────────
async function shutdown() {
    console.log('\n[Orquestrador] 🛑 Encerrando todos os Workers...');
    const stops = Object.keys(workers).map(sessionId =>
        sendToWorker(sessionId, { type: 'STOP' }).catch(() => {})
    );
    await Promise.allSettled(stops);
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌉 WhatsApp Bridge (Multi-Thread) escutando na porta ${PORT}`);
    console.log(`   Worker Script: ${WORKER_SCRIPT}`);
    console.log(`   Webhook URL:   ${WEBHOOK_URL}\n`);
});
