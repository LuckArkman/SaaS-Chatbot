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

/**
 * Normaliza um número de telefone para o formato JID do WhatsApp.
 *
 * Regras de detecção de código de país (DDI):
 *  - Se o número já tiver 12+ dígitos e começar com um DDI conhecido (55 para Brasil),
 *    é considerado que o DDI já está presente → usa o número diretamente.
 *  - Se o número tiver 10-11 dígitos (formato brasileiro sem DDI),
 *    adiciona automaticamente o prefixo 55 (Brasil).
 *  - Qualquer outro caso: usa os dígitos como estão.
 *
 * @param {string} phone - Número em qualquer formato (com ou sem DDI, com ou sem máscara)
 * @returns {string} JID completo no formato 'DDDDDDDDDDDD@s.whatsapp.net'
 */
function normalizeToJid(phone) {
    // Remove tudo que não é dígito
    const digits = phone.replace(/[^0-9]/g, '');

    // ✅ Número já possui código de país (12 ou 13 dígitos): usa diretamente
    // Ex: '5511999882626' (13) ou '551199882626' (12)
    if (digits.length >= 12) {
        console.log(`[normalize] Número '${phone}' já contém DDI → JID: ${digits}@s.whatsapp.net`);
        return `${digits}@s.whatsapp.net`;
    }

    // ➕ Número sem código de país (10-11 dígitos): adiciona DDI 55 (Brasil)
    // Ex: '11999882626' (11) ou '1199882626' (10)
    if (digits.length >= 10 && digits.length <= 11) {
        const jid = `55${digits}@s.whatsapp.net`;
        console.log(`[normalize] Número '${phone}' sem DDI → adicionando +55 → JID: ${jid}`);
        return jid;
    }

    // Fallback: número muito curto ou inválido, usa como está (Bridge retornará erro se inválido)
    console.warn(`[normalize] Número '${phone}' com formato inesperado (${digits.length} dígitos). Usando sem normalização.`);
    return `${digits}@s.whatsapp.net`;
}

async function connectToWhatsApp(sessionId) {
    if (sockets[sessionId]) return;

    console.log(`[*] Iniciando Baileys para sessão: ${sessionId}`);
    const tokenPath = path.join(__dirname, 'tokens', sessionId);
    if (!fs.existsSync(tokenPath)) {
        fs.mkdirSync(tokenPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(tokenPath);
    const { version } = await fetchLatestBaileysVersion();

    // Cache de mensagens por sessão (necessário para getMessage e chat-history)
    if (!global.messageCache) global.messageCache = {};
    if (!global.messageCache[sessionId]) global.messageCache[sessionId] = new Map();
    const msgCache = global.messageCache[sessionId];

    // Store manual leve compatível com Baileys 6.7.x
    // Substitui makeInMemoryStore (que não existe como named export nesta versão)
    const manualStore = {
        messages: {},  // jid -> Map(id -> msg)
        chats:    {},  // jid -> chatObj
        contacts: {},  // jid -> contactObj

        bind(ev) {
            // Persiste mensagens recebidas/enviadas
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    if (!msg.key?.remoteJid || !msg.key?.id) continue;
                    const jid = msg.key.remoteJid;
                    if (!this.messages[jid]) this.messages[jid] = new Map();
                    this.messages[jid].set(msg.key.id, msg);
                    msgCache.set(msg.key.id, msg.message);
                    // Limita 500 msg/sessão
                    if (msgCache.size > 500) {
                        msgCache.delete(msgCache.keys().next().value);
                    }
                }
            });
            // Persiste chats
            ev.on('chats.set', ({ chats }) => {
                for (const chat of chats) {
                    this.chats[chat.id] = chat;
                }
            });
            ev.on('chats.upsert', (chats) => {
                for (const chat of chats) {
                    this.chats[chat.id] = { ...(this.chats[chat.id] || {}), ...chat };
                }
            });
            // Persiste contatos
            ev.on('contacts.set', ({ contacts }) => {
                for (const c of contacts) {
                    if (c.id) this.contacts[c.id] = c;
                }
            });
            ev.on('contacts.upsert', (contacts) => {
                for (const c of contacts) {
                    if (c.id) this.contacts[c.id] = { ...(this.contacts[c.id] || {}), ...c };
                }
            });
            // ✅ CRÍTICO: Persiste o histórico maciço recebido durante a conexão (QR Code Linking)
            // O processamento agora é feito em CHUNKS assíncronos para não travar o loop de eventos
            // do Express. Isso permite receber comandos /sendMessage de outros tenants enquanto
            // um histórico grande é sincronizado.
            ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
                console.log(`[${sessionId}] 📚 Processando histórico massivo: chats=${chats?.length || 0}, contatos=${contacts?.length || 0}, msgs=${messages?.length || 0}`);
                
                const processBatch = async (items, processor) => {
                    if (!items || items.length === 0) return;
                    const batchSize = 100;
                    for (let i = 0; i < items.length; i += batchSize) {
                        items.slice(i, i + batchSize).forEach(processor);
                        // Cede CPU para outras requests HTTP (como /sendMessage)
                        await new Promise(resolve => setImmediate(resolve));
                    }
                };

                await processBatch(chats, (chat) => {
                    this.chats[chat.id] = chat;
                });

                await processBatch(contacts, (contact) => {
                    if (contact.id) this.contacts[contact.id] = contact;
                });

                await processBatch(messages, (msg) => {
                    if (msg.key?.remoteJid && msg.key?.id) {
                        const jid = msg.key.remoteJid;
                        if (!this.messages[jid]) this.messages[jid] = new Map();
                        this.messages[jid].set(msg.key.id, msg);
                    }
                });
                console.log(`[${sessionId}] ✅ Histórico finalizado e persistido em memória.`);
            });
        },

        // Compatível com a propriedade .chats.all() usada em /instance/chats
        getChatsList() {
            return Object.values(this.chats);
        },

        // Compatível com store.loadMessage(jid, id)
        async loadMessage(jid, id) {
            return this.messages[jid]?.get(id) || null;
        }
    };
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: logger.child({ session: sessionId }),
        browser: ["SaaS-OmniChannel", `Tenant-${sessionId}`, "1.0"],

        // ✅ CRÍTICO: getMessage é OBRIGATÓRIO no Baileys v6.x+
        // Sem esta função, o WhatsApp não consegue fazer retry de mensagens
        // e elas são descartadas silenciosamente no servidor.
        // Ref: https://baileys.wiki / whiskeysockets/baileys GitHub README
        getMessage: async (key) => {
            const cached = msgCache.get(key.id);
            if (cached) return cached;
            // Tenta via store em memória como fallback
            const stored = await manualStore.loadMessage(key.remoteJid, key.id);
            return stored?.message || { conversation: '' };
        }
    });

    manualStore.bind(sock.ev);
    sock.store = manualStore;

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
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut;

            // ✅ CORREÇÃO CRÍTICA: Sessões não autenticadas NÃO devem reconectar quando o QR expira.
            // "QR refs attempts ended" tem statusCode 515 — não é loggedOut (401),
            // mas também NÃO deve gerar reconexão automática.
            // Somente sessões que já estiveram autenticadas (state.creds.me definido)
            // devem reconectar ao serem desconectadas inesperadamente.
            const wasAuthenticated = !!state?.creds?.me;
            const isQrExpired = statusCode === 515; // Stream.Failure / QR refs attempts ended

            let shouldReconnect = false;
            if (isLoggedOut) {
                // Logout explícito: nunca reconecta (apaga creds)
                shouldReconnect = false;
                console.log(`[${sessionId}] ❌ Logout remoto — removendo sessão.`);
                try {
                    const tokenPath = path.join(__dirname, 'tokens', sessionId);
                    if (fs.existsSync(tokenPath)) {
                        fs.rmSync(tokenPath, { recursive: true, force: true });
                        console.log(`[${sessionId}] 🗑️ Tokens removidos por logout.`);
                    }
                } catch (e) { console.error(`[${sessionId}] Erro ao remover tokens:`, e.message); }
            } else if (isQrExpired) {
                // QR expirou sem autenticação: não reconecta — evita zombie session storm
                shouldReconnect = false;
                console.log(`[${sessionId}] ⏰ QR expirado sem autenticação — sessão encerrada sem reconexão.`);
            } else if (wasAuthenticated) {
                // Sessão autenticada perdeu conexão (queda de rede, etc): reconecta
                shouldReconnect = true;
                console.log(`[${sessionId}] 🔄 Sessão autenticada desconectada — reagendando reconexão.`);
            } else {
                // Sessão nunca autenticada, erro genérico: não reconecta
                shouldReconnect = false;
                console.log(`[${sessionId}] ⚠️ Sessão não autenticada encerrada (código ${statusCode}) — sem reconexão.`);
            }

            console.log(`[${sessionId}] Conexão fechada | código=${statusCode} | autenticada=${wasAuthenticated} | Reconnect=${shouldReconnect}`);

            delete sockets[sessionId];
            delete latestQrs[sessionId];
            sessionStatuses[sessionId] = 'DISCONNECTED';

            await notifyStatus(sessionId, 'DISCONNECTED');

            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(sessionId), 3000);
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
                if (msg.message) {
                    try {
                        const content =
                            msg.message.conversation ||
                            msg.message.extendedTextMessage?.text ||
                            msg.message.imageMessage?.caption ||
                            msg.message.videoMessage?.caption ||
                            "";

                        const webhookUrl = process.env.WEBHOOK_URL || 'http://127.0.0.1:8001/api/v1/gateway/webhook/whatsapp';
                        const headers = { 'x-api-key': 'SaaS_Secret_Gateway_Key_2026' };

                        const envelope = {
                            event: 'on_message',
                            session: sessionId,
                            payload: {
                                id:         msg.key.id,
                                from:       msg.key.remoteJid,
                                body:       content,
                                type:       'chat',
                                isGroupMsg: msg.key.remoteJid?.endsWith('@g.us') || false,
                                pushName:   msg.pushName || null,
                                fromMe:     msg.key.fromMe || false,
                                timestamp:  msg.messageTimestamp || Math.floor(Date.now() / 1000)
                            }
                        };

                        console.log(`[${sessionId}] 📥 Mensagem recebida de ${msg.key.remoteJid}: "${content.substring(0, 60)}"`);
                        await axios.post(webhookUrl, envelope, { headers });
                    } catch (err) {
                        console.error(`[${sessionId}] Erro ao encaminhar para webhook:`, err.message);
                    }
                }

                // ✅ Salva TODAS as mensagens no cache (incluindo fromMe=true)
                // Necessário para getMessage funcionar corretamente em retries do WhatsApp
                if (msg.message && msg.key?.id) {
                    msgCache.set(msg.key.id, msg.message);
                    // Limita cache a 500 mensagens por sessão para evitar vazamento de memória
                    if (msgCache.size > 500) {
                        const firstKey = msgCache.keys().next().value;
                        msgCache.delete(firstKey);
                    }
                }
            }
        }
    });

    // ✅ Monitora ACKs de entrega E repassa ao Python (AckWorker)
    // ack: 1 = Servidor | 2 = Recebido | 3 = Entregue ao dispositivo | 4 = Lido
    sock.ev.on('messages.update', async (updates) => {
        const webhookUrl = process.env.WEBHOOK_URL || 'http://127.0.0.1:8001/api/v1/gateway/webhook/whatsapp';
        const headers = { 'x-api-key': 'SaaS_Secret_Gateway_Key_2026' };

        for (const update of updates) {
            if (update.update?.status === undefined) continue;

            const ack   = update.update.status;
            const msgId = update.key?.id || 'unknown';
            const jid   = update.key?.remoteJid || 'unknown';
            const ackLabels = { 1: 'SERVIDOR', 2: 'RECEBIDO', 3: 'ENTREGUE', 4: 'LIDO' };
            const label = ackLabels[ack] || `ACK_${ack}`;

            console.log(`[${sessionId}] 📬 ACK [${label}] msg='${msgId}' → jid='${jid}'`);

            // ─── Forward do ACK para o Python (AckWorker) ──────────────────
            try {
                await axios.post(webhookUrl, {
                    event: 'on_ack',
                    session: sessionId,
                    payload: {
                        id:     msgId,
                        to:     jid,
                        status: ack,
                        ack:    ack
                    }
                }, { headers, timeout: 5000 });
                console.log(`[${sessionId}] ✅ ACK [${label}] encaminhado ao webhook Python | msg='${msgId}'`);
            } catch (ackErr) {
                console.warn(`[${sessionId}] ⚠️ Falha ao encaminhar ACK ao webhook: ${ackErr.message}`);
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

/**
 * POST /instance/sendMessage
 * Body: { sessionId, to, content }
 *
 * Envia uma mensagem de texto simples pelo WhatsApp.
 * Inclui instrumentação completa de cada etapa do ciclo de vida:
 *   [1] Validação de parâmetros
 *   [2] Resolução do socket + verificação de estado
 *   [3] Normalização do número → JID
 *   [4] Chamada sock.sendMessage()
 *   [5] Extração e log do msgId retornado
 *   [6] Resposta de sucesso/falha com contexto completo
 */
app.post('/instance/sendMessage', async (req, res) => {
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; // trace ID por requisição
    const { sessionId, to, content } = req.body;

    console.log(`\n[${sessionId}][REQ:${reqId}] ━━━━━━━━━━━━━━ SEND MESSAGE ━━━━━━━━━━━━━━`);
    console.log(`[${sessionId}][REQ:${reqId}] [1/6] Parâmetros recebidos | to='${to}' | content_len=${content?.length ?? 0}`);

    // [1] Validação de parâmetros obrigatórios
    if (!sessionId || !to || !content) {
        const missing = ['sessionId', 'to', 'content'].filter(f => !req.body[f]).join(', ');
        console.error(`[${sessionId}][REQ:${reqId}] ❌ [1/6] FALHA — Parâmetros ausentes: ${missing}`);
        return res.status(400).json({ error: `Campos obrigatórios ausentes: ${missing}` });
    }

    // [2] Resolução do socket e verificação de estado
    const sock = sockets[sessionId];
    const currentState = sessionStatuses[sessionId] || 'DESCONHECIDO';

    console.log(`[${sessionId}][REQ:${reqId}] [2/6] Socket encontrado: ${!!sock} | Estado atual: '${currentState}'`);

    if (!sock) {
        console.error(`[${sessionId}][REQ:${reqId}] ❌ [2/6] FALHA — Nenhum socket ativo para esta sessão.`);
        console.error(`[${sessionId}][REQ:${reqId}]         Sessions ativas: [${Object.keys(sockets).join(', ')}]`);
        return res.status(404).json({
            error: `Instância '${sessionId}' não encontrada ou desconectada.`,
            active_sessions: Object.keys(sockets)
        });
    }

    if (currentState !== 'CONNECTED') {
        console.error(`[${sessionId}][REQ:${reqId}] ❌ [2/6] FALHA — Instância não está CONNECTED (estado='${currentState}').`);
        return res.status(409).json({
            error: `Instância '${sessionId}' não está conectada.`,
            state: currentState
        });
    }

    // [3] Normalização do número → JID
    const jid = normalizeToJid(to);
    console.log(`[${sessionId}][REQ:${reqId}] [3/6] JID normalizado | '${to}' → '${jid}'`);

    // [4] Chamada sock.sendMessage()
    console.log(`[${sessionId}][REQ:${reqId}] [4/6] Chamando sock.sendMessage() | jid='${jid}' | content='${content.substring(0, 80)}'`);

    try {
        const sendStart = Date.now();
        const sentMsg = await sock.sendMessage(jid, { text: content });
        const elapsed = Date.now() - sendStart;

        // [5] Extração e validação do resultado
        const msgId   = sentMsg?.key?.id;
        const fromMe  = sentMsg?.key?.fromMe;
        const status  = sentMsg?.status;

        console.log(`[${sessionId}][REQ:${reqId}] [5/6] sendMessage() retornou em ${elapsed}ms`);
        console.log(`[${sessionId}][REQ:${reqId}]       → msgId:  '${msgId}'`);
        console.log(`[${sessionId}][REQ:${reqId}]       → fromMe: ${fromMe}`);
        console.log(`[${sessionId}][REQ:${reqId}]       → status: ${status}`);
        console.log(`[${sessionId}][REQ:${reqId}]       → sentMsg completo: ${JSON.stringify(sentMsg?.key || {})}`);

        if (!msgId) {
            console.warn(`[${sessionId}][REQ:${reqId}] ⚠️ [5/6] msgId não presente na resposta — WhatsApp pode não ter confirmado o enfileiramento.`);
        }

        // [6] Resposta de sucesso
        const responsePayload = {
            success:   true,
            status:    'sent',
            messageId: msgId || null,
            to:        jid,
            elapsed_ms: elapsed
        };

        console.log(`[${sessionId}][REQ:${reqId}] [6/6] ✅ SUCESSO — Resposta: ${JSON.stringify(responsePayload)}`);
        console.log(`[${sessionId}][REQ:${reqId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        return res.json(responsePayload);

    } catch (err) {
        // [6] Log de falha completo
        console.error(`[${sessionId}][REQ:${reqId}] [6/6] ❌ FALHA — Exceção em sock.sendMessage()`);
        console.error(`[${sessionId}][REQ:${reqId}]         jid:     '${jid}'`);
        console.error(`[${sessionId}][REQ:${reqId}]         message: ${err.message}`);
        console.error(`[${sessionId}][REQ:${reqId}]         stack:   ${err.stack?.split('\n').slice(0, 3).join(' | ')}`);
        console.error(`[${sessionId}][REQ:${reqId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        return res.status(500).json({
            error:      'Erro ao enviar mensagem via Baileys.',
            detail:     err.message,
            session:    sessionId,
            jid,
            req_id:     reqId
        });
    }
});

/**
 * GET /instance/chats
 * Query: { sessionId }
 * Retorna a lista completa de conversas abertas no WhatsApp da sessão,
 * ordenadas pela mensagem mais recente.
 */
app.get('/instance/chats', async (req, res) => {
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
        // Usa o manualStore compatível com Baileys 6.7.x
        const rawChats = (sock.store?.getChatsList ? sock.store.getChatsList() : []);

        const chats = rawChats
            .filter(chat => chat.id && !chat.id.includes('@broadcast'))
            .sort((a, b) => {
                const tsA = a.conversationTimestamp || a.lastMsgTimestamp || 0;
                const tsB = b.conversationTimestamp || b.lastMsgTimestamp || 0;
                return tsB - tsA; // Mais recentes primeiro
            })
            .map(chat => {
                const contactFallback = sock.store?.contacts?.[chat.id];
                const realName = chat.name || contactFallback?.name || contactFallback?.notify || null;
                return {
                    id: chat.id,                  // JID completo ex: 5511999999999@s.whatsapp.net
                    phone: chat.id.split('@')[0],  // Número limpo
                    name: realName,
                    unread_count: chat.unreadCount || 0,
                    last_message_timestamp: chat.conversationTimestamp || chat.lastMsgTimestamp || null,
                    is_group: chat.id.endsWith('@g.us'),
                    pinned: chat.pinned || false
                };
            });

        console.log(`[${sessionId}] Lista de chats solicitada: ${chats.length} conversa(s).`);

        return res.json({
            success: true,
            total: chats.length,
            session_id: sessionId,
            chats
        });
    } catch (err) {
        console.error(`[${sessionId}] Erro ao listar chats:`, err.message);
        return res.status(500).json({ error: 'Erro interno ao listar conversas.', detail: err.message });
    }
});

/**
 * GET /instance/chat-history
 * Query: { sessionId, jid, limit? }
 * Retorna o histórico de mensagens de uma conversa específica via JID.
 * O JID pode ser o número (5511...@s.whatsapp.net) ou ID de grupo (@g.us).
 */
app.get('/instance/chat-history', async (req, res) => {
    const { sessionId, jid, limit = 50 } = req.query;

    if (!sessionId || !jid) {
        return res.status(400).json({ error: 'sessionId e jid são obrigatórios' });
    }

    const sock = sockets[sessionId];
    if (!sock) {
        return res.status(404).json({ error: `Instância '${sessionId}' não encontrada.` });
    }

    if (sessionStatuses[sessionId] !== 'CONNECTED') {
        return res.status(409).json({
            error: 'Instância não está conectada.',
            state: sessionStatuses[sessionId]
        });
    }

    try {
        const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);

        // Tenta buscar do store em cache primeiro (mais rápido)
        let messages = [];
        const cachedMsgs = sock.store?.messages?.[jid];
        if (cachedMsgs) {
            // Compatibilidade com manualStore (Map) e makeInMemoryStore (Array)
            const all = typeof cachedMsgs.values === 'function' 
                ? Array.from(cachedMsgs.values()) 
                : (cachedMsgs.array || []);
            
            // Ordena cronologicamente antes de fatiar para garantir o fluxo de tempo correto na UI
            all.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));
            messages = all.slice(-parsedLimit);
        } else {
            // Fallback: Se não tem no cache do manualStore, não temos o histórico imediatamente carregado.
            // Para não quebrar (sock.loadMessages não é padrão default Baileys em manualStore), retornamos array vazio.
            messages = [];
        }

        const formatted = messages
            .filter(msg => msg && msg.message)  // Filtra mensagens vazias/de sistema
            .map(msg => {
                const textContent =
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    msg.message?.videoMessage?.caption ||
                    '[mídia]';

                return {
                    message_id: msg.key.id,
                    from_me: msg.key.fromMe,
                    sender: msg.key.fromMe ? sessionId : (msg.key.participant || jid),
                    content: textContent,
                    type: Object.keys(msg.message || {})[0] || 'unknown',
                    timestamp: msg.messageTimestamp || null,
                    status: msg.status || null
                };
            });

        console.log(`[${sessionId}] Histórico de ${jid}: ${formatted.length} msg(s) carregada(s).`);

        return res.json({
            success: true,
            jid,
            phone: jid.split('@')[0],
            total: formatted.length,
            has_more: formatted.length >= parsedLimit,
            messages: formatted
        });
    } catch (err) {
        console.error(`[${sessionId}] Erro ao buscar histórico de ${jid}:`, err.message);
        return res.status(500).json({ error: 'Erro interno ao buscar histórico.', detail: err.message });
    }
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
/**
 * PUT /contacts/edit
 * Body: { sessionId, phone, name }
 * Atualiza o nome do contato localmente no cache do agente Baileys.
 */
app.put('/contacts/edit', async (req, res) => {
    const { sessionId, phone, name } = req.body;

    if (!sessionId || !phone || !name) {
        return res.status(400).json({ error: 'sessionId, phone e name são obrigatórios' });
    }

    const sock = sockets[sessionId];
    if (!sock || sessionStatuses[sessionId] !== 'CONNECTED') {
        return res.status(409).json({ error: 'Instância não conectada.' });
    }

    try {
        const normalizedPhone = phone.replace(/[^0-9+]/g, '');
        const jid = `${normalizedPhone}@s.whatsapp.net`;

        if (sock.store && sock.store.contacts) {
            sock.store.contacts[jid] = { 
                ...(sock.store.contacts[jid] || { id: jid }), 
                name: name,
                notify: name
            };
        }

        console.log(`[${sessionId}] Contato editado no agente: ${jid} -> ${name}`);
        return res.json({ success: true, contact: { jid, phone: normalizedPhone, name } });
    } catch (err) {
        console.error(`[${sessionId}] Erro ao editar contato ${phone}:`, err.message);
        return res.status(500).json({ error: 'Erro ao editar o contato no WhatsApp.', detail: err.message });
    }
});

/**
 * DELETE /contacts/delete
 * Body: { sessionId, phone }
 * Remove o contato do cache local do agente e tenta apagar a tela de chat fisicamente no zap.
 */
app.delete('/contacts/delete', async (req, res) => {
    const { sessionId, phone } = req.body;

    if (!sessionId || !phone) {
        return res.status(400).json({ error: 'sessionId e phone são obrigatórios' });
    }

    const sock = sockets[sessionId];
    if (!sock || sessionStatuses[sessionId] !== 'CONNECTED') {
        return res.status(409).json({ error: 'Instância não conectada.' });
    }

    try {
        const normalizedPhone = phone.replace(/[^0-9+]/g, '');
        const jid = `${normalizedPhone}@s.whatsapp.net`;

        if (sock.store && sock.store.contacts && sock.store.contacts[jid]) {
            delete sock.store.contacts[jid];
        }

        return res.json({ success: true, message: 'Contato deletado', phone: normalizedPhone });
    } catch (err) {
        console.error(`[${sessionId}] Erro ao deletar contato ${phone}:`, err.message);
        return res.status(500).json({ error: 'Erro ao deletar o contato no WhatsApp.', detail: err.message });
    }
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Bridge (Baileys) listening on port ${PORT}`);
});
