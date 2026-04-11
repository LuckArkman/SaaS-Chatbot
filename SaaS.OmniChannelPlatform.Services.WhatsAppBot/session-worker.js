/**
 * session-worker.js
 * 
 * 🧵 Worker Thread isolado por tenant/sessão Baileys.
 * 
 * Cada tenant que se conectar ao sistema cria uma INSTÂNCIA deste Worker em
 * sua própria thread OS. Isso garante:
 *   ✅ Isolamento total: crash/lentidão de um tenant não afeta outros.
 *   ✅ CPU paralela: o processamento de histórico num tenant não trava os demais.
 *   ✅ Memória isolada: os Maps de mensagens/chats/contatos são por thread.
 * 
 * Protocolo de comunicação com o Orquestrador (index.js) via postMessage:
 * 
 * [Orquestrador → Worker]  { type: 'SEND_MESSAGE', to, content, reqId }
 * [Orquestrador → Worker]  { type: 'GET_STATUS' }
 * [Orquestrador → Worker]  { type: 'GET_QRCODE' }
 * [Orquestrador → Worker]  { type: 'GET_CHATS', limit }
 * [Orquestrador → Worker]  { type: 'GET_HISTORY', jid, limit }
 * [Orquestrador → Worker]  { type: 'GET_CONTACTS' }
 * [Orquestrador → Worker]  { type: 'VERIFY_CONTACT', phone }
 * [Orquestrador → Worker]  { type: 'STOP' }
 * 
 * [Worker → Orquestrador]  { type: 'REPLY', reqId, success, data, error }
 * [Worker → Orquestrador]  { type: 'EVENT', event, payload }  (status, qr, mensagens)
 */

'use strict';

const { workerData, parentPort } = require('worker_threads');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const pino   = require('pino');
const QRCode = require('qrcode');

const { sessionId, webhookUrl, apiKey } = workerData;
const logger = pino({ level: 'warn' }); // warn para reduzir ruído por thread

// ─────────────────────────────────────────────────────────────────────────────
// Estado privado desta thread (completamente isolado dos outros workers)
// ─────────────────────────────────────────────────────────────────────────────
let sock         = null;
let latestQr     = null;
let sessionState = 'DISCONNECTED';  // DISCONNECTED | CONNECTING | QRCODE | CONNECTED
let manualStore  = null;
const msgCache   = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// WebhookQueue — Fila FIFO Sequencial para entrega de eventos ao Python
// Garante que bursts (ex: 200 msgs de histórico) não sobrecarreguem o backend
// e que a ordem de chegada seja preservada por sessão.
// ─────────────────────────────────────────────────────────────────────────────
class WebhookQueue {
    constructor() {
        this.queue        = [];
        this.isProcessing = false;
    }

    enqueue(event, payload) {
        this.queue.push({ event, session: sessionId, payload });
        if (!this.isProcessing) this._process();
    }

    async _process() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const item = this.queue[0];
            try {
                await axios.post(
                    webhookUrl,
                    item,
                    { headers: { 'x-api-key': apiKey }, timeout: 20000 }
                );
                log(`✅ [Queue] Webhook entregue: ${item.event} | ID: ${item.payload?.id || 'N/A'}`);
            } catch (e) {
                const status = e.response?.status ?? 'SEM_RESPOSTA';
                log(`❌ [Queue] Webhook falhou (${item.event}) | Status: ${status} | ${e.message}`);
                if (status === 429 || status === 503) {
                    await sleep(2000);
                }
            }
            this.queue.shift();
            await sleep(20); // backpressure leve entre entregas
        }

        this.isProcessing = false;
    }
}

const webhookQueue = new WebhookQueue();

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) { console.log(`[${sessionId}] ${msg}`); }

function reply(reqId, success, data = null, error = null) {
    parentPort.postMessage({ type: 'REPLY', reqId, success, data, error });
}

function emit(event, payload) {
    parentPort.postMessage({ type: 'EVENT', event, payload });
}

function normalizeToJid(phone) {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length >= 12) return `${digits}@s.whatsapp.net`;
    if (digits.length >= 10) return `55${digits}@s.whatsapp.net`;
    return `${digits}@s.whatsapp.net`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conexão Baileys — Ciclo de vida completo dentro desta thread
// ─────────────────────────────────────────────────────────────────────────────
async function connectToWhatsApp() {
    if (sock) return; // Evita dupla inicialização

    log('🔌 Iniciando conexão Baileys...');
    sessionState = 'CONNECTING';
    emit('state_change', { state: 'CONNECTING' });

    const tokenPath = path.join(__dirname, 'tokens', sessionId);
    if (!fs.existsSync(tokenPath)) fs.mkdirSync(tokenPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tokenPath);
    const { version }          = await fetchLatestBaileysVersion();

    // ── Manual Store (isolado nesta thread) ──────────────────────────────────
    manualStore = {
        messages: {},
        chats:    {},
        contacts: {},

        bind(ev) {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    if (!msg.key?.remoteJid || !msg.key?.id) continue;
                    const jid = msg.key.remoteJid;
                    if (!this.messages[jid]) this.messages[jid] = new Map();
                    this.messages[jid].set(msg.key.id, msg);
                    msgCache.set(msg.key.id, msg.message);
                    if (msgCache.size > 500) msgCache.delete(msgCache.keys().next().value);
                }
            });

            ev.on('chats.set',    ({ chats })    => { chats.forEach(c => { this.chats[c.id] = c; }); });
            ev.on('chats.upsert', (chats)        => { chats.forEach(c => { this.chats[c.id] = { ...(this.chats[c.id] || {}), ...c }; }); });
            ev.on('contacts.set',    ({ contacts }) => { contacts.forEach(c => { if (c.id) this.contacts[c.id] = c; }); });
            ev.on('contacts.upsert', (contacts)    => { contacts.forEach(c => { if (c.id) this.contacts[c.id] = { ...(this.contacts[c.id] || {}), ...c }; }); });

            // Histórico massivo em chunks → não trava o event loop desta thread
            ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
                log(`📚 Histórico: chats=${chats?.length || 0} | contacts=${contacts?.length || 0} | msgs=${messages?.length || 0}`);
                const batch = async (items, fn) => {
                    if (!items?.length) return;
                    for (let i = 0; i < items.length; i += 100) {
                        items.slice(i, i + 100).forEach(fn);
                        await new Promise(r => setImmediate(r));
                    }
                };
                await batch(chats,    (c) => { this.chats[c.id] = c; });
                await batch(contacts, (c) => { if (c.id) this.contacts[c.id] = c; });
                await batch(messages, (m) => {
                    if (m.key?.remoteJid && m.key?.id) {
                        const jid = m.key.remoteJid;
                        if (!this.messages[jid]) this.messages[jid] = new Map();
                        this.messages[jid].set(m.key.id, m);
                    }
                });
                log('✅ Histórico persistido em memória da thread.');
            });
        },

        async loadMessage(jid, id) {
            return this.messages[jid]?.get(id) || null;
        }
    };

    sock = makeWASocket({
        version,
        auth:              state,
        printQRInTerminal: false,
        logger:            logger.child({ session: sessionId }),
        browser:           ['SaaS-OmniChannel', `Tenant-${sessionId}`, '1.0'],
        getMessage: async (key) => {
            const cached = msgCache.get(key.id);
            if (cached) return cached;
            const stored = await manualStore.loadMessage(key.remoteJid, key.id);
            return stored?.message || { conversation: '' };
        }
    });

    manualStore.bind(sock.ev);
    sock.store = manualStore;

    // ── Eventos de Conexão ───────────────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            log('📱 Novo QR Code gerado.');
            latestQr     = (await QRCode.toDataURL(qr)).trim();
            sessionState = 'QRCODE';
            emit('state_change', { state: 'QRCODE' });
            webhookQueue.enqueue('on_state_change', { state: 'QRCODE', qrcode: latestQr });
        }

        if (connection === 'open') {
            log('✅ Conectado!');
            sessionState = 'CONNECTED';
            latestQr     = null;
            emit('state_change', { state: 'CONNECTED' });
            webhookQueue.enqueue('on_state_change', { state: 'CONNECTED' });
        }

        if (connection === 'close') {
            const statusCode      = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut     = statusCode === DisconnectReason.loggedOut;
            const isQrExpired     = statusCode === 515;
            const wasAuthenticated = !!state?.creds?.me;

            log(`🔌 Conexão fechada | código=${statusCode} | autenticada=${wasAuthenticated}`);

            sock         = null;
            latestQr     = null;
            sessionState = 'DISCONNECTED';
            emit('state_change', { state: 'DISCONNECTED' });
            webhookQueue.enqueue('on_state_change', { state: 'DISCONNECTED' });

            if (isLoggedOut) {
                log('❌ Logout remoto — removendo tokens.');
                const tokenPath = path.join(__dirname, 'tokens', sessionId);
                if (fs.existsSync(tokenPath)) fs.rmSync(tokenPath, { recursive: true, force: true });
                // Termina o worker: o orquestrador vai limpar a referência
                process.exit(0);
            } else if (!isQrExpired && wasAuthenticated) {
                log('🔄 Reconectando em 3s...');
                setTimeout(connectToWhatsApp, 3000);
            } else {
                log('⏰ Sessão encerrada. Worker permanece aguardando comandos.');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ── Mensagens recebidas ──────────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            const content =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption    ||
                msg.message.videoMessage?.caption    ||
                '';

            const payload = {
                id:         msg.key.id,
                from:       msg.key.remoteJid,
                body:       content,
                type:       'chat',
                isGroupMsg: msg.key.remoteJid?.endsWith('@g.us') || false,
                pushName:   msg.pushName    || null,
                fromMe:     msg.key.fromMe  || false,
                timestamp:  msg.messageTimestamp || Math.floor(Date.now() / 1000)
            };

            msgCache.set(msg.key.id, msg.message);
            if (msgCache.size > 1000) msgCache.delete(msgCache.keys().next().value);

            webhookQueue.enqueue('on_message', payload);
        }
    });

    // ── ACKs de entrega ──────────────────────────────────────────────────────
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update?.status === undefined) continue;
            webhookQueue.enqueue('on_ack', {
                id:     update.key?.id      || 'unknown',
                to:     update.key?.remoteJid || 'unknown',
                status: update.update.status,
                ack:    update.update.status
            });
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Receptor de comandos do Orquestrador
// ─────────────────────────────────────────────────────────────────────────────
parentPort.on('message', async (msg) => {
    const { type, reqId } = msg;

    try {
        switch (type) {

            case 'START':
                await connectToWhatsApp();
                reply(reqId, true, { state: sessionState });
                break;

            case 'STOP':
                if (sock) {
                    try { await sock.logout(); } catch (_) {}
                    sock = null;
                }
                sessionState = 'DISCONNECTED';
                reply(reqId, true);
                process.exit(0);
                break;

            case 'GET_STATUS':
                reply(reqId, true, { state: sessionState, qrReady: !!latestQr });
                break;

            case 'GET_QRCODE':
                if (latestQr) reply(reqId, true, { qrcode: latestQr });
                else          reply(reqId, false, null, 'QR não disponível');
                break;

            case 'SEND_MESSAGE': {
                if (!sock || sessionState !== 'CONNECTED') {
                    reply(reqId, false, null, `Sessão não conectada (estado: ${sessionState})`);
                    break;
                }
                const jid    = normalizeToJid(msg.to);
                const result = await sock.sendMessage(jid, { text: msg.content });
                reply(reqId, true, { message_id: result?.key?.id, jid });
                break;
            }

            case 'GET_CHATS': {
                if (!manualStore) { reply(reqId, true, { chats: [] }); break; }
                const limit     = msg.limit || 50;
                const allChats  = Object.values(manualStore.chats)
                    .filter(c => c.id && !c.id.endsWith('@g.us'))
                    .slice(0, limit)
                    .map(c => ({
                        id:    c.id,
                        phone: c.id.split('@')[0],
                        name:  manualStore.contacts[c.id]?.name || c.name || null,
                        unreadCount: c.unreadCount || 0
                    }));
                reply(reqId, true, { chats: allChats });
                break;
            }

            case 'GET_HISTORY': {
                if (!manualStore) { reply(reqId, true, { messages: [] }); break; }
                const limit   = Math.min(msg.limit || 50, 200);
                const jidKey  = msg.jid;
                const stored  = manualStore.messages[jidKey];
                if (!stored)  { reply(reqId, true, { messages: [] }); break; }

                const all = typeof stored.values === 'function'
                    ? Array.from(stored.values())
                    : (stored.array || []);

                all.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));
                const sliced = all.slice(-limit);

                const formatted = sliced
                    .filter(m => m && m.message)
                    .map(m => ({
                        message_id: m.key.id,
                        from_me:    m.key.fromMe,
                        content:    m.message?.conversation ||
                                    m.message?.extendedTextMessage?.text ||
                                    m.message?.imageMessage?.caption     ||
                                    '[mídia]',
                        type:       Object.keys(m.message || {})[0] || 'unknown',
                        timestamp:  m.messageTimestamp || null,
                        status:     m.status || null
                    }));

                reply(reqId, true, {
                    jid: jidKey,
                    phone:    jidKey.split('@')[0],
                    total:    formatted.length,
                    messages: formatted
                });
                break;
            }

            case 'GET_CONTACTS': {
                if (!manualStore) { reply(reqId, true, { contacts: [] }); break; }
                const contacts = Object.entries(manualStore.contacts)
                    .filter(([jid]) => jid.endsWith('@s.whatsapp.net'))
                    .map(([jid, c]) => ({
                        jid,
                        phone: jid.replace('@s.whatsapp.net', ''),
                        name:  c.name || c.notify || null,
                        short_name: c.short || null
                    }));
                reply(reqId, true, { total: contacts.length, contacts });
                break;
            }

            case 'VERIFY_CONTACT': {
                if (!sock || sessionState !== 'CONNECTED') {
                    reply(reqId, false, null, 'Sessão não conectada');
                    break;
                }
                const normalizedPhone = msg.phone.replace(/[^0-9+]/g, '');
                const [result] = await sock.onWhatsApp(normalizedPhone);
                if (!result?.exists) {
                    reply(reqId, false, null, `Número ${msg.phone} não possui conta WhatsApp.`);
                } else {
                    reply(reqId, true, {
                        contact: { jid: result.jid, phone: normalizedPhone, verified: true }
                    });
                }
                break;
            }

            default:
                log(`⚠️ Comando desconhecido: ${type}`);
                reply(reqId, false, null, `Comando '${type}' não reconhecido.`);
        }

    } catch (err) {
        log(`❌ Erro ao processar comando '${type}': ${err.message}`);
        reply(reqId, false, null, err.message);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Inicialização automática ao ser criado pelo Orquestrador
// ─────────────────────────────────────────────────────────────────────────────
connectToWhatsApp().catch(err => {
    log(`❌ Falha crítica na inicialização: ${err.message}`);
    process.exit(1);
});
