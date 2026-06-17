import { Chat, Contact } from "baileys";
import Baileys from "../../models/Baileys";

interface Request {
  whatsappId: number;
  contacts?: Contact[]; // pode vir em formato parcial (id + campos opcionais)
  chats?: Chat[];       // idem
}

function safeParseArray(input: any): any[] {
  try {
    if (Array.isArray(input)) return input;
    if (typeof input === "string" && input.trim().length > 0) {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

function pickDefinedFields<T extends Record<string, any>>(obj: T): T {
  // Remove campos undefined e strings vazias para não sobrescrever com "nada"
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

function mergeById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
  // Estratégia: base tem prioridade; incoming complementa campos vazios/faltantes
  const map = new Map<string, T>();
  base.forEach((b) => map.set(b.id, b));
  for (const n of incoming) {
    const existing = map.get(n.id);
    if (!existing) {
      map.set(n.id, n);
      continue;
    }
    // Merge “parcial”: não perder campos do existente; apenas complementar/atualizar com valores definidos
    const merged = { ...existing, ...pickDefinedFields(n) };
    map.set(n.id, merged);
  }
  return Array.from(map.values());
}

const createOrUpdateBaileysService = async ({
  whatsappId,
  contacts,
  chats,
}: Request): Promise<Baileys> => {
  try {
    const baileysExists = await Baileys.findOne({
      where: { whatsappId }
    });

    if (baileysExists) {
      // Normaliza arrays atuais do banco (podem ser string JSON ou array)
      let currentChats: any[] = safeParseArray(baileysExists.chats);
      let currentContacts: any[] = safeParseArray(baileysExists.contacts);

      // Normaliza entradas novas (podem vir tipadas como Chat/Contact mas com campos parciais)
      const incomingChats: any[] = Array.isArray(chats) ? chats : [];
      const incomingContacts: any[] = Array.isArray(contacts) ? contacts : [];

      // Faz o merge por id, complementando campos
      if (incomingChats.length > 0) {
        currentChats = mergeById<any>(currentChats, incomingChats);
      }
      if (incomingContacts.length > 0) {
        currentContacts = mergeById<any>(currentContacts, incomingContacts);
      }

      // Se algo mudou, persiste
      if (incomingChats.length > 0 || incomingContacts.length > 0) {
        baileysExists.chats = JSON.stringify(currentChats);
        baileysExists.contacts = JSON.stringify(currentContacts);
        await baileysExists.save();
      }

      return baileysExists;
    }

    // Não existia registro para esse whatsappId: cria novo
    const baileys = await Baileys.create({
      whatsappId,
      contacts: JSON.stringify(Array.isArray(contacts) ? contacts : []),
      chats: JSON.stringify(Array.isArray(chats) ? chats : [])
    });
    return baileys;

  } catch (error) {
    console.log("ERRO NO SERVICE DE CRIAÇÃO/ATUALIZAÇÃO DO BAILEYS", error);
    throw error;
  }
};

export default createOrUpdateBaileysService;
