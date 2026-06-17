const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { WhatsAppInstance } = require('../models/sql/models');
const qrcode = require('qrcode-terminal');

const sessions = new Map();
const retriesMap = new Map();

const loggerBaileys = pino({ level: "silent" });

const initWASocket = async (instanceId, tenantId, sessionName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const sessionDir = path.join(__dirname, '..', '..', 'sessions', `${tenantId}_${sessionName}`);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      
      const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: false }));
      logger.info(`[Tenant:${tenantId}] Iniciando sessão Baileys v${version.join(".")} (Latest: ${isLatest})`);

      const wsocket = makeWASocket({
        version,
        logger: loggerBaileys,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, loggerBaileys)
        },
        generateHighQualityLinkPreview: false,
        qrTimeout: 120000,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        shouldIgnoreJid: jid => isJidBroadcast(jid) || isJidGroup(jid)
      });

      // Patch: Fila sequencial (Mutex) isolada POR CHAT (remoteJid) para o envio de mensagens.
      // Garante que mensagens para o mesmo contato cheguem na ordem e não engasguem,
      // mas permite que o tenant fale com 100 contatos diferentes simultaneamente sem atraso.
      const originalSendMessage = wsocket.sendMessage.bind(wsocket);
      wsocket.sendQueues = new Map(); // Mapa de filas: remoteJid -> Promise

      wsocket.sendMessage = async (jid, content, options) => {
        if (!wsocket.sendQueues.has(jid)) {
          wsocket.sendQueue = Promise.resolve();
          wsocket.sendQueues.set(jid, Promise.resolve());
        }

        const sendPromise = new Promise((resolve, reject) => {
          const currentQueue = wsocket.sendQueues.get(jid);
          const nextQueue = currentQueue.then(async () => {
            try {
              // Delay aleatório anti-bloqueio entre 500ms a 1500ms específico para esta conversa
              await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
              const result = await originalSendMessage(jid, content, options);
              resolve(result);
            } catch (e) {
              logger.error(`[Tenant:${tenantId}] Erro ao enviar na fila para ${jid}: ` + e.message);
              reject(e);
            }
          });
          wsocket.sendQueues.set(jid, nextQueue);
        });

        return sendPromise;
      };

      wsocket.ev.on('creds.update', saveCreds);

      wsocket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logger.info(`[Tenant:${tenantId}] QR Code gerado para sessão ${sessionName}`);
          // qrcode.generate(qr, { small: true });
          await WhatsAppInstance.update(
            { status: 'QRCODE', qrcode_base64: qr },
            { where: { id: instanceId } }
          );
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.message;
          logger.info(`[Tenant:${tenantId}] Conexão fechada. Code: ${statusCode}, Msg: ${errorMessage}`);

          if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
            logger.warn(`[Tenant:${tenantId}] Sessão deslogada. Apagando credenciais...`);
            fs.rmSync(sessionDir, { recursive: true, force: true });
            sessions.delete(instanceId);
            
            await WhatsAppInstance.update(
              { status: 'DISCONNECTED', qrcode_base64: null },
              { where: { id: instanceId } }
            );
            return;
          }

          // Tratamento de falhas e reconexão (backoff simples)
          const attempts = retriesMap.get(instanceId) || 0;
          if (attempts < 5) {
            retriesMap.set(instanceId, attempts + 1);
            const delay = Math.min(5000 * Math.pow(2, attempts), 60000);
            logger.info(`[Tenant:${tenantId}] Reconectando em ${delay}ms (Tentativa ${attempts + 1})`);
            
            setTimeout(() => {
              initWASocket(instanceId, tenantId, sessionName).catch(err => logger.error(`Erro ao reconectar: ${err.message}`));
            }, delay);
          } else {
            logger.error(`[Tenant:${tenantId}] Máximo de tentativas alcançado. Sessão parada.`);
            await WhatsAppInstance.update({ status: 'ERR_SESSION' }, { where: { id: instanceId } });
          }
        }

        if (connection === 'open') {
          logger.info(`[Tenant:${tenantId}] Conexão estabelecida com sucesso!`);
          retriesMap.delete(instanceId);
          
          await WhatsAppInstance.update(
            { status: 'CONNECTED', qrcode_base64: null, retries: 0 },
            { where: { id: instanceId } }
          );

          sessions.set(instanceId, wsocket);
          resolve(wsocket);
        }
      });

      // Se a conexão não completar nem fechar em um tempo, podemos apenas resolver a Promise (estado inicial)
      // para não travar a thread de boot.
      setTimeout(() => {
        sessions.set(instanceId, wsocket);
        resolve(wsocket);
      }, 5000);

    } catch (err) {
      logger.error(`[Tenant:${tenantId}] Erro no initWASocket: ${err.message}`);
      reject(err);
    }
  });
};

const getWbot = (instanceId) => {
  const wsocket = sessions.get(instanceId);
  if (!wsocket) {
    throw new Error('Sessão do WhatsApp não inicializada (Baileys não encontrado)');
  }
  return wsocket;
};

const removeWbot = async (instanceId) => {
  try {
    const wsocket = sessions.get(instanceId);
    if (wsocket) {
      wsocket.logout().catch(() => {});
      wsocket.ws?.close();
      sessions.delete(instanceId);
    }
  } catch (err) {
    logger.error(`Erro ao remover wbot: ${err.message}`);
  }
};

module.exports = { initWASocket, getWbot, removeWbot };
