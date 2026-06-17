import Contact from "../../models/Contact";

function extractNumberFromJid(jid: string): string {
  try { return jid.split("@")[0].split(":")[0].replace(/\D/g, ""); } catch { return ""; }
}

function pickName(c: any, fallback: string) {
  return c?.name || c?.notify || c?.verifiedName || c?.pushname || fallback;
}

interface Req {
  companyId: number;
  obj: any; // { id, name?, notify?, verifiedName?, pushname? }
}

const UpsertContactFromBaileysService = async ({ companyId, obj }: Req) => {
  const number = extractNumberFromJid(obj?.id || "");
  if (!number) return;

  const contact = await Contact.findOne({ where: { companyId, number } });
  if (!contact) return; // não cria, só melhora o que já existe

  const nameCand = pickName(obj, number);
  const patch: any = {};

  if (!contact.name || contact.name === contact.number) patch.name = nameCand;

  if (Object.keys(patch).length > 0) {
    await contact.update(patch);
  }
};

export default UpsertContactFromBaileysService;
