import * as Sentry from "@sentry/node";

import makeWASocket, {
  AuthenticationState,
  Browsers,
  DisconnectReason,
  WAMessage,
  WAMessageKey,
  WASocket,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  type GroupMetadata
} from "baileys";

import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import MAIN_LOGGER from "baileys/lib/Utils/logger";
import { useMultiFileAuthState } from "../helpers/useMultiFileAuthState";
import { Boom } from "@hapi/boom";
import AppError from "../errors/AppError";
import { getIO } from "./socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "./cache";
import ImportWhatsAppMessageService from "../services/WhatsappService/ImportWhatsAppMessageService";
import { add } from "date-fns";
import moment from "moment";
import { getTypeMessage, isValidMsg } from "../services/WbotServices/wbotMessageListener";
import { addLogs } from "../helpers/addLogs";
import NodeCache from "node-cache";
import { Store } from "./store";
import { LIDMappingStore } from "baileys/lib/Signal/lid-mapping";
import qrcode from "qrcode-terminal"; // QR no terminal para debug / instalações novas

// --- Fallback WA Web version (usada somente se o fetchRecommended falhar)
const FALLBACK_WA_VERSION: [number, number, number] = [2, 3000, 1027934701];

// --- Caches de retry e mensagens ---
const msgRetryCounterCache = new NodeCache({
  stdTTL: 600,
  maxKeys: 1000,
  checkperiod: 300,
  useClones: false
});

const msgCache = new NodeCache({
  stdTTL: 60,
  maxKeys: 1000,
  checkperiod: 300,
  useClones: false
});

const loggerBaileys = MAIN_LOGGER.child({});
loggerBaileys.level = "error";

type Session = WASocket & {
  id?: number;
  companyId?: number; // 🔒 empresa dona da sessão
  store?: Store | any;
  _contactsCache?: Map<string, any>;
  lidMappingStore?: LIDMappingStore;
};

const sessions: Session[] = [];

// --- Estados de proteção e reconexão ---
const badMacState = new Map<number, { count: number; last: number }>();
const reconnectAttemptMap = new Map<number, number>();
const reconnectLock = new Map<number, boolean>();
const reconnectTimers = new Map<number, NodeJS.Timeout>();
const startingSessions = new Set<number>();
const retriesQrCodeMap = new Map<number, number>();

// --- Rate limit extra (para 403/geral) ---
const reconnectAttempts403 = new Map<number, number>();
const lastReconnectTime = new Map<number, number>();
const MIN_RECONNECT_INTERVAL = 10_000; // 10s

// --- Flag para saber se estamos em "new login" (QR recém escaneado) ---
const newLoginFlag = new Map<number, boolean>();

// --- Cache de metadados de grupos ---
const groupCache = new NodeCache({
  stdTTL: 3600,
  maxKeys: 10000,
  checkperiod: 600,
  useClones: false
});

// helper limpar timer/backoff
const clearReconnectTimer = (wid: number) => {
  const t = reconnectTimers.get(wid);
  if (t) clearTimeout(t);
  reconnectTimers.delete(wid);
  reconnectLock.set(wid, false);
  reconnectAttemptMap.set(wid, 0);
};

// DB de mensagens para quoted/getMessage
export default function msg() {
  return {
    get: (key: WAMessageKey) => {
      const { id } = key;
      if (!id) return;
      const data = msgCache.get(id);
      if (data) {
        try {
          const msg = JSON.parse(data as string);
          return msg?.message;
        } catch (e) {
          logger.error(e);
        }
      }
    },
    save: (m: WAMessage) => {
      const { id } = m.key;
      const s = JSON.stringify(m);
      try {
        msgCache.set(id as string, s);
      } catch (e) {
        logger.error(e);
      }
    }
  };
}

export var dataMessages: any = {};
export const msgDB = msg();

// 🔒 Agora aceita opcionalmente companyId para garantir que a sessão é da empresa correta
export const getWbot = (whatsappId: number, companyId?: number): Session => {
  const idx = sessions.findIndex(s => {
    if (s.id !== whatsappId) return false;
    if (companyId != null && s.companyId != null) {
      return s.companyId === companyId;
    }
    return true;
  });

  if (idx === -1) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  return sessions[idx];
};

export const tryGetWbot = (whatsappId: number, companyId?: number): Session | null => {
  const idx = sessions.findIndex(s => {
    if (s.id !== whatsappId) return false;
    if (companyId != null && s.companyId != null) {
      return s.companyId === companyId;
    }
    return true;
  });
  return idx === -1 ? null : sessions[idx];
};

export const getKnownContacts = (whatsappId: number): string[] => {
  try {
    const w = getWbot(whatsappId);
    const ids = Array.from(w?._contactsCache?.keys?.() || []);
    return ids.filter(j => j && j.endsWith("@s.whatsapp.net"));
  } catch {
    return [];
  }
};

export const ensureContactSyncKick = async (whatsappId: number): Promise<string[]> => {
  const w = getWbot(whatsappId);
  let spins = 20;
  while (spins-- > 0) {
    if ((w as any)?.user?.id) break;
    await new Promise(r => setTimeout(r, 500));
  }
  const before = (w?._contactsCache?.size ?? 0);
  try {
    await w?.presenceSubscribe?.((w as any)?.user?.id || "");
  } catch {}
  try {
    await new Promise(r => setTimeout(r, 300));
  } catch {}
  let attempts = 10;
  while (attempts-- > 0) {
    const now = (w?._contactsCache?.size ?? 0);
    if (now > before) break;
    await new Promise(r => setTimeout(r, 500));
  }
  return getKnownContacts(whatsappId);
};

export const restartWbot = async (companyId: number): Promise<void> => {
  try {
    const whatsapps = await Whatsapp.findAll({
      where: { companyId },
      attributes: ["id", "companyId", "name"]
    });
    for (const w of whatsapps) {
      clearReconnectTimer(w.id);
      try {
        const idx = sessions.findIndex(s => s.id === w.id);
        if (idx !== -1) (sessions[idx] as any)?.ws?.close?.();
      } catch {}
      await removeWbot(w.id, false);
      if (startingSessions.has(w.id)) continue;
      startingSessions.add(w.id);
      setTimeout(() => {
        StartWhatsAppSession(w, w.companyId).finally(() => startingSessions.delete(w.id));
      }, 1500);
    }
  } catch (err) {
    logger.error(err);
  }
};

export const removeWbot = async (whatsappId: number, isLogout = true): Promise<void> => {
  try {
    const idx = sessions.findIndex(s => s.id === whatsappId);
    if (idx !== -1) {
      try {
        if (isLogout) await sessions[idx].logout?.();
      } catch {}
      try {
        (sessions[idx] as any)?.ws?.close?.();
      } catch {}
      try {
        (sessions[idx] as any)?.ev?.removeAllListeners?.();
      } catch {}
      sessions.splice(idx, 1);
    }
  } catch (err) {
    logger.error(err);
  }
};

// --- scheduleReconnect com lock/backoff + rate-limit ---
const scheduleReconnect = (what: Whatsapp, delayMs = 0, reasonText = "") => {
  const wid = what.id;
  if (reconnectLock.get(wid)) return;
  reconnectLock.set(wid, true);

  const attempt = Math.min((reconnectAttemptMap.get(wid) || 0) + 1, 6);
  const base = Math.pow(2, attempt) * 1000;
  let wait = Math.max(5000, Math.max(base, delayMs)); // min 5s

  const now = Date.now();
  const last = lastReconnectTime.get(wid) || 0;
  if (now - last < MIN_RECONNECT_INTERVAL) {
    wait = Math.max(wait, MIN_RECONNECT_INTERVAL - (now - last) + 500);
  }
  lastReconnectTime.set(wid, now + wait);

  logger.info(
    `Session ${what.name} disconnected ${reasonText ? `[${reasonText}] ` : ""}- Reconnecting in ${wait}ms (attempt ${attempt})`
  );

  clearReconnectTimer(wid);
  const timer = setTimeout(async () => {
    reconnectLock.set(wid, false);
    reconnectTimers.delete(wid);
    if (startingSessions.has(wid)) return;
    startingSessions.add(wid);
    try {
      await StartWhatsAppSession(what, what.companyId);
    } finally {
      startingSessions.delete(wid);
    }
  }, wait);
  reconnectAttemptMap.set(wid, attempt);
  reconnectTimers.set(wid, timer);
};

export const initWASocket = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise(async (resolve, reject) => {
    try {
      (async () => {
        const io = getIO();

        const whatsappUpdate = await Whatsapp.findOne({ where: { id: whatsapp.id } });
        if (!whatsappUpdate) return;

        const { id, name, allowGroup, companyId } = whatsappUpdate;

        // 1) Obter versão RECOMENDADA pelo Baileys v7 (com fallback seguro)
        let waVersion: [number, number, number];
        try {
          const { version, isLatest } = await fetchLatestBaileysVersion();
          waVersion = version;
          logger.info(`(Recomendado) WA Web v${version.join(".")} | isLatest:${isLatest}`);
          logger.info(`Iniciando sessão ${name} com Baileys v7 + WAWeb ${version.join(".")}`);
        } catch (e: any) {
          waVersion = FALLBACK_WA_VERSION;
          logger.warn(
            `fetchLatestBaileysVersion falhou (${e?.message || e}). Usando fallback ${waVersion.join(".")}`
          );
        }

        logger.info(`Starting session ${name}`);
        let retriesQrCode = 0;

        let wsocket: Session = null;

        const { state, saveCreds } = await useMultiFileAuthState(whatsapp);
        const signalKeyStore = makeCacheableSignalKeyStore(state.keys, logger);

        // 2) Cache de metadata de grupos
        const cachedGroupMetadata = async (jid: string): Promise<GroupMetadata> => {
          let data: GroupMetadata | undefined = groupCache.get(jid);
          if (data) return data;
          const result = await wsocket.groupMetadata(jid);
          groupCache.set(jid, result);
          return result;
        };

        // 3) PATCH defensivo de Buffer.from (edge cases)
        const originalBufferFrom = Buffer.from;
        Buffer.from = function (value: any, ...args: any[]) {
          try {
            if (
              typeof value === "object" &&
              value !== null &&
              !Array.isArray(value) &&
              !Buffer.isBuffer(value) &&
              !(value instanceof Uint8Array) &&
              !(value instanceof ArrayBuffer) &&
              value.constructor === Object
            ) {
              try {
                const keys = Object.keys(value);
                const isNumeric = keys.every(k => /^\d+$/.test(k));
                if (isNumeric && keys.length > 0) {
                  const maxIndex = Math.max(...keys.map(k => parseInt(k)));
                  const arr = new Array(maxIndex + 1);
                  for (let i = 0; i <= maxIndex; i++) arr[i] = (value as any)[i] || 0;
                  return originalBufferFrom.call(this, arr);
                }
                return originalBufferFrom.call(this, value, ...args);
              } catch {
                return originalBufferFrom.call(this, value, ...args);
              }
            }
            return originalBufferFrom.call(this, value, ...args);
          } catch {
            return originalBufferFrom.call(this, value, ...args);
          }
        };

        // 4) SOCKET com versão RECOMENDADA
        wsocket = makeWASocket({
          version: waVersion,
          logger: loggerBaileys,
          // printQRInTerminal está deprecated; mantemos false e usamos qrcode-terminal manualmente
          printQRInTerminal: false,
          auth: {
            creds: state.creds,
            keys: signalKeyStore
          },
          browser: Browsers.ubuntu("Chrome"),

          generateHighQualityLinkPreview: false,
          linkPreviewImageThumbnailWidth: 128,
          qrTimeout: 120_000,

          syncFullHistory: false,
          fireInitQueries: true,
          markOnlineOnConnect: false,

          defaultQueryTimeoutMs: 45_000,
          connectTimeoutMs: 60_000,
          keepAliveIntervalMs: 20_000,

          msgRetryCounterCache,
          retryRequestDelayMs: 1_000,
          maxMsgRetryCount: 3,
          emitOwnEvents: true,

          transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3_000 },

          shouldIgnoreJid: jid => isJidBroadcast(jid) || (!allowGroup && isJidGroup(jid)),
          getMessage: msgDB.get,

          cachedGroupMetadata
        });

        // 5) LID Mapping (construtor v7 espera um logger simples)
        const noopLogger = {
          debug: (..._args: any[]) => {},
          info: (..._args: any[]) => {},
          warn: (..._args: any[]) => {},
          error: (..._args: any[]) => {}
        };
        const lidMappingStore = new LIDMappingStore(signalKeyStore as any, noopLogger as any);

        // 6) Caches expostos (compat)
        wsocket._contactsCache = new Map<string, any>();
        (wsocket as any).store = { contacts: {} };
        wsocket.lidMappingStore = lidMappingStore;

        // 7) Popular caches de contatos/chats
        wsocket.ev.process(async (events: any) => {
          if (events["contacts.set"]) {
            try {
              const { contacts } = events["contacts.set"] as any;
              for (const c of contacts || []) {
                const jid = (c as any)?.id;
                if (!jid) continue;
                wsocket._contactsCache!.set(jid, c);
                (wsocket as any).store.contacts[jid] = c;
              }
            } catch (e) {
              logger.warn(`contacts.set cache error: ${(e as any)?.message}`);
            }
          }
          if (events["chats.set"]) {
            try {
              const { chats } = events["chats.set"] as any;
              for (const ch of chats || []) {
                const jid = (ch as any)?.id;
                if (!jid) continue;
                if (!wsocket._contactsCache!.has(jid)) {
                  const basic = { id: jid };
                  wsocket._contactsCache!.set(jid, basic);
                  (wsocket as any).store.contacts[jid] = basic;
                }
              }
            } catch (e) {
              logger.warn(`chats.set cache error: ${(e as any)?.message}`);
            }
          }
          if (events["contacts.upsert"]) {
            const list = (events["contacts.upsert"] as any) || [];
            for (const c of list) {
              const jid = (c as any)?.id;
              if (!jid) continue;
              wsocket._contactsCache!.set(jid, c);
              (wsocket as any).store.contacts[jid] = c;
            }
          }
          if (events["contacts.update"]) {
            const list = (events["contacts.update"] as any) || [];
            for (const c of list) {
              const jid = (c as any)?.id;
              if (!jid) continue;
              const prev = wsocket._contactsCache!.get(jid) || {};
              const merged = { ...prev, ...c };
              wsocket._contactsCache!.set(jid, merged);
              (wsocket as any).store.contacts[jid] = merged;
            }
          }
          if (events["chats.upsert"]) {
            const chats = (events["chats.upsert"] as any)?.[0]?.list || [];
            for (const ch of chats) {
              const jid = (ch as any)?.id;
              if (!jid) continue;
              if (!wsocket._contactsCache!.has(jid)) {
                const basic = { id: jid };
                wsocket._contactsCache!.set(jid, basic);
                (wsocket as any).store.contacts[jid] = basic;
              }
            }
          }
        });

        // 8) Import de mensagens antigas – sua lógica mantida
        setTimeout(async () => {
          const wpp = await Whatsapp.findByPk(whatsapp.id);
          if (wpp?.importOldMessages && wpp.status === "CONNECTED") {
            const dateOldLimit = new Date(wpp.importOldMessages).getTime();
            const dateRecentLimit = new Date(wpp.importRecentMessages).getTime();

            addLogs({
              fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`,
              forceNewFile: true,
              text: `Aguardando conexão para iniciar a importação de mensagens:
  Whatsapp nome: ${wpp.name}
  Whatsapp Id: ${wpp.id}
  Criação do arquivo de logs: ${moment().format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data de inicio de importação: ${moment(dateOldLimit).format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data final da importação: ${moment(dateRecentLimit).format("DD/MM/YYYY HH:mm:ss")}
  `
            });

            const statusImportMessages = Date.now();
            await wpp.update({ statusImportMessages });

            wsocket.ev.on("messaging-history.set", async (messageSet: any) => {
              const statusImportMessages2 = Date.now();
              await wpp.update({ statusImportMessages: statusImportMessages2 });

              const whatsappId = whatsapp.id;
              const filteredMessages = messageSet.messages;
              const filteredDateMessages: any[] = [];

              filteredMessages.forEach(msg => {
                const timestampMsg = Math.floor(msg.messageTimestamp["low"] * 1000);
                if (isValidMsg(msg) && dateOldLimit < timestampMsg && dateRecentLimit > timestampMsg) {
                  if (msg.key?.remoteJid.split("@")[1] !== "g.us") {
                    addLogs({
                      fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`,
                      text: `Adicionando mensagem para pos processamento:
  Não é Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}
  
  `
                    });
                    filteredDateMessages.push(msg);
                  } else if (wpp?.importOldMessagesGroups) {
                    addLogs({
                      fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`,
                      text: `Adicionando mensagem para pos processamento:
  Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}
  
  `
                    });
                    filteredDateMessages.push(msg);
                  }
                }
              });

              if (!dataMessages?.[whatsappId]) dataMessages[whatsappId] = [];
              dataMessages[whatsappId].unshift(...filteredDateMessages);

              setTimeout(async () => {
                const wpp2 = await Whatsapp.findByPk(whatsappId);
                io.of(String(companyId)).emit(`importMessages-${wpp2.companyId}`, {
                  action: "update",
                  status: { this: -1, all: -1 }
                });
                io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
                  action: "update",
                  session: wpp2
                });
              }, 500);

              setTimeout(async () => {
                const wpp3 = await Whatsapp.findByPk(whatsappId);
                if (wpp3?.importOldMessages) {
                  const isTimeStamp = !isNaN(
                    new Date(Math.floor(parseInt(String(wpp3?.statusImportMessages)))).getTime()
                  );
                  if (isTimeStamp) {
                    const ultimoStatus = new Date(
                      Math.floor(parseInt(String(wpp3?.statusImportMessages)))
                    ).getTime();
                    const dataLimite = +add(ultimoStatus, { seconds: +45 }).getTime();
                    if (dataLimite < Date.now()) {
                      ImportWhatsAppMessageService(wpp3.id);
                      wpp3.update({ statusImportMessages: "Running" });
                    }
                  }
                }
                io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
                  action: "update",
                  session: wpp3
                });
              }, 1000 * 45);
            });
          }
        }, 2500);

        // ========================================================================
        // 9) Bloco connection.update CORRIGIDO
        // ========================================================================
        wsocket.ev.on("connection.update", async update => {
          const safe = JSON.stringify(
            update,
            (k, v) => (k === "qr" && typeof v === "string" ? "***qr omitted***" : v)
          );
          logger.info(`Connection Update: ${safe}`);

          const { connection, lastDisconnect, qr } = update;

          const errorBoom = lastDisconnect?.error as Boom | undefined;
          const statusCode = Number(errorBoom?.output?.statusCode || 0);
          const errorMessage = (lastDisconnect as any)?.error?.message || "";

          // Se este update sinalizar "new login", marcamos numa flag global
          if ((update as any)?.isNewLogin) {
            newLoginFlag.set(id, true);
          }

          if (connection === "close") {
            // calculamos se estávamos em new login recentemente
            const wasNewLogin = newLoginFlag.get(id) === true;

            // connection replaced
            if (statusCode === DisconnectReason.connectionReplaced) {
              logger.warn(
                `Session ${name} connectionReplaced — outra instância ativa. Não vou reconectar aqui.`
              );
              clearReconnectTimer(id);
              newLoginFlag.delete(id);
              await removeWbot(id, false);
              return;
            }

            // 401 / loggedOut - APENAS AQUI CHAMAMOS DeleteBaileysService
            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
              const isIntentionalLogout = /Intentional Logout/i.test(errorMessage || "");

              if (isIntentionalLogout) {
                // Logout feito pelo painel (desconectar conexão)
                logger.warn(
                  `Session ${name} logout intencional (via painel). Não será feito auto-reconnect.`
                );
                clearReconnectTimer(id);
                newLoginFlag.delete(id);
                // Aqui normalmente DeleteBaileysService já foi chamado pela rota de logout
                await removeWbot(id, false);
                return;
              }

              // Logout vindo do celular / servidor => tratamos como antes
              logger.warn(`Session ${name} logged out (401). Limpando sessão e marcando como DISCONNECTED`);
              
              await DeleteBaileysService(whatsapp.id);
              await whatsapp.update({
                status: "DISCONNECTED",
                session: "",
                qrcode: "",
                number: ""
              });
              
              await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
              io.of(String(companyId)).emit(
                `company-${whatsapp.companyId}-whatsappSession`,
                { action: "update", session: whatsapp }
              );
              
              clearReconnectTimer(id);
              newLoginFlag.delete(id);
              await removeWbot(id, false);
              
              // Aguarda comando manual para novo QR
              logger.info(`Session ${name} desconectada. Aguardando comando manual para novo QR.`);
              return;
            }

            // Bad MAC / integridade de chaves
            if (/bad mac|mac check|integrity|invalid mac|checksum/i.test(errorMessage)) {
              logger.warn(
                `Session ${name} key integrity error (Bad MAC), clearing sessão`
              );
              await whatsapp.update({
                status: "DISCONNECTED",
                session: "",
                qrcode: ""
              });
              await DeleteBaileysService(whatsapp.id);
              await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
              io.of(String(companyId)).emit(
                `company-${whatsapp.companyId}-whatsappSession`,
                { action: "update", session: whatsapp }
              );
              clearReconnectTimer(id);
              newLoginFlag.delete(id);
              await removeWbot(id, false);
              scheduleReconnect(whatsapp, 5000, "bad-mac");
              return;
            }

            // ========================================================================
            // CORREÇÃO 515 - TRATAMENTO SIMPLIFICADO
            // ========================================================================
            if (statusCode === 515) {
              logger.warn(
                `Session ${name} desconectada com erro 515 (stream) (isNewLogin=${wasNewLogin}) — tratando como erro transitório, sem limpar sessão`
              );

              // NÃO chama DeleteBaileysService aqui
              // NÃO muda status para DISCONNECTED aqui

              // Apenas agenda nova tentativa de conexão com backoff
              const attempts = reconnectAttemptMap.get(id) || 0;
              const delay = Math.min(30000, 5000 * (attempts + 1)); // 5s, 10s, 15s... máx 30s

              reconnectAttemptMap.set(id, attempts + 1);

              logger.info(
                `Session ${name} disconnected (code 515). Reconnecting in ${delay}ms (attempt ${attempts + 1})`
              );

              clearReconnectTimer(id);
              newLoginFlag.delete(id);
              await removeWbot(id, false);

              setTimeout(() => {
                StartWhatsAppSession(whatsapp, companyId).catch(err =>
                  logger.error(
                    `Erro ao tentar reconectar sessão ${name} após 515:`,
                    err
                  )
                );
              }, delay);

              return;
            }
            // ========================================================================
            // FIM CORREÇÃO 515
            // ========================================================================

            // 403 com tentativas inteligentes
            if (statusCode === 403) {
              const attempts = reconnectAttempts403.get(id) || 0;
              if (attempts < 5) {
                reconnectAttempts403.set(id, attempts + 1);
                const delays = [2000, 5000, 10000, 30000, 60000];
                clearReconnectTimer(id);
                newLoginFlag.delete(id);
                await removeWbot(id, false);
                scheduleReconnect(whatsapp, delays[attempts], `403 tentativa ${attempts + 1}`);
                return;
              } else {
                logger.error(
                  `403 persistente para ${name} — deletando sessão após 5 tentativas`
                );
                reconnectAttempts403.delete(id);
                await whatsapp.update({
                  status: "PENDING",
                  session: "",
                  number: ""
                });
                await DeleteBaileysService(whatsapp.id);
                clearReconnectTimer(id);
                newLoginFlag.delete(id);
                await removeWbot(id, false);
                io.of(String(companyId)).emit(
                  `company-${whatsapp.companyId}-whatsappSession`,
                  { action: "update", session: whatsapp }
                );
                scheduleReconnect(whatsapp, 5000, "403-reset");
                return;
              }
            }

            // transitórios padrão (410/428/440/499/5xx/0)
            const transientCodes = new Set([410, 428, 440, 499]);
            if (transientCodes.has(statusCode) || statusCode >= 500 || statusCode === 0) {
              logger.info(
                `Session ${name} transient disconnect (code ${
                  statusCode || "?"
                }). Backoff reconnect.`
              );
              clearReconnectTimer(id);
              newLoginFlag.delete(id);
              await removeWbot(id, false);
              scheduleReconnect(whatsapp, 0, "transient");
              return;
            }

            // fallback
            clearReconnectTimer(id);
            newLoginFlag.delete(id);
            await removeWbot(id, false);
            scheduleReconnect(whatsapp, 0, "fallback");
            return;
          }

          if (connection === "open") {
            // reset backoff/locks/timers/403/newLogin
            clearReconnectTimer(whatsapp.id);
            reconnectAttempts403.delete(id);
            lastReconnectTime.delete(id);
            newLoginFlag.delete(id);
            reconnectAttemptMap.delete(id); // Reset attempts on successful connection

            await whatsapp.update({
              status: "CONNECTED",
              qrcode: "",
              retries: 0,
              number:
                wsocket.type === "md"
                  ? jidNormalizedUser((wsocket as WASocket).user.id).split("@")[0]
                  : "-"
            });

            io.of(String(companyId)).emit(
              `company-${whatsapp.companyId}-whatsappSession`,
              {
                action: "update",
                session: whatsapp
              }
            );

            const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
            wsocket.id = whatsapp.id;
            wsocket.companyId = whatsapp.companyId; // 🔒 vincula sessão à empresa
            if (sessionIndex === -1) sessions.push(wsocket);
            else sessions[sessionIndex] = wsocket;

            // Importar contatos pós-conexão (leve delay)
            setTimeout(async () => {
              try {
                const { default: ImportContactsService } = await import(
                  "../services/WbotServices/ImportContactsService"
                );
                await ImportContactsService(companyId);
              } catch (e) {
                logger.warn(
                  `Falha ao rodar ImportContactsService pós-conexão: ${
                    (e as any)?.message
                  }`
                );
              }
            }, 8000);

            resolve(wsocket);
          }

          if (qr !== undefined) {
            retriesQrCodeMap.set(id, 0);
            logger.info(`Session QRCode Generate ${name}`);

            // QR no terminal também (manual, sem usar printQRInTerminal)
            try {
              qrcode.generate(qr, { small: true });
            } catch (err) {
              logger.warn(
                `Falha ao gerar QR no terminal: ${(err as any)?.message}`
              );
            }

            await whatsapp.update({
              qrcode: qr,
              status: "qrcode",
              retries: 0,
              number: ""
            });

            const idx = sessions.findIndex(s => s.id === whatsapp.id);
            wsocket.id = whatsapp.id;
            wsocket.companyId = whatsapp.companyId; // 🔒 garante empresa também no estado de QR
            if (idx === -1) sessions.push(wsocket);
            else sessions[idx] = wsocket;

            io.of(String(companyId)).emit(
              `company-${whatsapp.companyId}-whatsappSession`,
              {
                action: "update",
                session: whatsapp
              }
            );

            // CORREÇÃO: timer de expiração do QR
            const oldQrTimer = reconnectTimers.get(id);
            if (oldQrTimer) clearTimeout(oldQrTimer);

            const qrTimer = setTimeout(async () => {
              reconnectTimers.delete(id);

              const current = await Whatsapp.findByPk(whatsapp.id);
              if (current?.status === "qrcode") {
                logger.info(`Regenerating QR Code for ${name} after timeout`);
                await removeWbot(id, false);
                scheduleReconnect(whatsapp, 2000, "qr-timeout");
              }
            }, 120_000);

            reconnectTimers.set(id, qrTimer);
          }
        });

        // 10) GARANTIA: registrar o saveCreds
        wsocket.ev.on("creds.update", saveCreds);

        // 11) Debounce Bad MAC em upsert (mantido)
        wsocket.ev.on("messages.upsert", async () => {
          try {
            // processamento normal em wbotMessageListener
          } catch (error: any) {
            const msg = String(error?.message || "");
            if (/bad mac/i.test(msg)) {
              const now = Date.now();
              const prev = badMacState.get(id) ?? { count: 0, last: 0 };
              const within2min = now - prev.last < 120_000;
              const count = within2min ? prev.count + 1 : 1;
              badMacState.set(id, { count, last: now });

              if (count >= 3) {
                logger.error(
                  `Session ${name}: Bad MAC repetido (${count}x) — limpando sessão`
                );
                await whatsapp.update({
                  status: "DISCONNECTED",
                  session: "",
                  qrcode: ""
                });
                await DeleteBaileysService(whatsapp.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                io.of(String(companyId)).emit(
                  `company-${whatsapp.companyId}-whatsappSession`,
                  {
                    action: "update",
                    session: whatsapp
                  }
                );
                await removeWbot(id, false);
                scheduleReconnect(whatsapp, 5000, "bad-mac-upsert");
              } else {
                logger.info(
                  `Session ${name}: Bad MAC transitório em upsert (${count}x). Backoff reconnect.`
                );
                await removeWbot(id, false);
                scheduleReconnect(whatsapp, 0, "bad-mac-upsert");
              }
            } else {
              logger.error(
                `Session ${name}: Message processing error: ${msg}`
              );
            }
          }
        });

        (wsocket as any)?.ws?.on?.("error", (error: any) => {
          logger.error(
            `Session ${name}: WebSocket error: ${error?.message}`
          );
        });
      })();
    } catch (error) {
      Sentry.captureException(error);
      console.log(error);
      reject(error);
    }
  });
};
