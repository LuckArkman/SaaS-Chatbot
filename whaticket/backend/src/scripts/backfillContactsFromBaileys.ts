/* eslint-disable no-console */
import { Op } from "sequelize";
import Baileys from "../models/Baileys";
import Contact from "../models/Contact";
import sequelize from "../database";

function extractNumberFromJid(jid: string): string {
  try { return jid.split("@")[0].split(":")[0].replace(/\D/g, ""); } catch { return ""; }
}

/**
 * Gera candidatos de número para o Brasil:
 * - num (só dígitos)
 * - sem 55
 * - adiciona/remove nono dígito após DDD (heurística)
 */
function candidatesBR(numDigits: string): string[] {
  const out = new Set<string>();
  const n = (numDigits || "").replace(/\D/g, "");
  if (!n) return [];

  out.add(n);

  if (n.startsWith("55")) {
    const local = n.slice(2);
    if (local) out.add(local);

    // Se tem 11 digitos (DD + 9 + 8), tenta remover o nono
    if (local.length === 11 && /^[1-9]{2}9[0-9]{8}$/.test(local)) {
      out.add(local.slice(0, 2) + local.slice(3));
    }
    // Se tem 10 (DD + 8) e parece celular sem nono, tenta inserir nono 9
    if (local.length === 10 && /^[1-9]{2}[2-9][0-9]{7}$/.test(local)) {
      out.add(local.slice(0, 2) + "9" + local.slice(2));
    }
  } else {
    // Sem 55: tenta com 55
    out.add("55" + n);
    // Heurística de nono:
    if (n.length === 11 && /^[1-9]{2}9[0-9]{8}$/.test(n)) {
      out.add(n.slice(0, 2) + n.slice(3)); // remove nono
    }
    if (n.length === 10 && /^[1-9]{2}[2-9][0-9]{7}$/.test(n)) {
      out.add(n.slice(0, 2) + "9" + n.slice(2)); // adiciona nono
    }
  }

  return Array.from(out);
}

function pickName(c: any, fallback: string) {
  return c?.name || c?.notify || c?.verifiedName || c?.pushname || fallback;
}

async function backfill(companyId: number, whatsappId?: number, createMissing = false) {
  const rows = await Baileys.findAll({
    where: whatsappId ? { whatsappId } : undefined
  });

  let updated = 0;
  let created = 0;

  for (const row of rows) {
    const contacts: any[] =
      typeof row.contacts === "string"
        ? JSON.parse(row.contacts || "[]")
        : row.contacts || [];

    for (const c of contacts) {
      const jidNum = extractNumberFromJid(c?.id || "");
      if (!jidNum) continue;

      const cand = candidatesBR(jidNum);
      if (cand.length === 0) continue;

      // Procura contato existente por qualquer candidato
      let contact = await Contact.findOne({
        where: { companyId, number: { [Op.in]: cand } }
      });

      const nameCand = pickName(c, cand[0]);

      if (contact) {
        // Atualiza nome apenas se estiver vazio/igual ao número
        if (!contact.name || contact.name === contact.number) {
          await contact.update({ name: nameCand });
          updated++;
        }
      } else if (createMissing) {
        // Cria novo contato (usa o formato "local" se existir)
        const preferLocal = cand.find(x => !x.startsWith("55")) || cand[0];
        await Contact.create({
          companyId,
          name: nameCand,
          number: preferLocal,
          email: null,
          profilePicUrl: null,
          isGroup: false
        });
        created++;
      }
    }
  }

  console.log(`Backfill concluído. Atualizados: ${updated} | Criados: ${created}`);
}

(async () => {
  try {
    const companyIdArg = process.argv.find(a => a.startsWith("--company="));
    const whatsIdArg = process.argv.find(a => a.startsWith("--whats="));
    const createArg = process.argv.find(a => a === "--create-missing");

    if (!companyIdArg) {
      console.error("Uso: npx ts-node -T src/scripts/backfillContactsFromBaileys.ts --company=1 [--whats=2] [--create-missing]");
      process.exit(1);
    }

    const companyId = Number(companyIdArg.split("=")[1]);
    const whatsappId = whatsIdArg ? Number(whatsIdArg.split("=")[1]) : undefined;
    const createMissing = !!createArg;

    await sequelize.authenticate();
    await backfill(companyId, whatsappId, createMissing);
    process.exit(0);
  } catch (e) {
    console.error("Erro no backfill:", e);
    process.exit(1);
  }
})();
