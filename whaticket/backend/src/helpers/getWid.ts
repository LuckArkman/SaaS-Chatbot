import type { proto } from "baileys";

/** Extrai o WID/JID do message key (grupo ou 1:1). */
export function getWidFromMsg(msg: proto.IWebMessageInfo | any): string | null {
  const key = msg?.key ?? {};
  const wid = key.participant || key.remoteJid || null;
  return typeof wid === "string" && wid.length ? wid : null;
}
