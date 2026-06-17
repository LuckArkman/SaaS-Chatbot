import * as Sentry from "@sentry/node";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot, getKnownContacts, ensureContactSyncKick } from "../../libs/wbot";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import CreateContactService from "../ContactServices/CreateContactService";
import { isString, isArray } from "lodash";
import path from "path";
import fs from "fs";
import ShowBaileysService from "../BaileysServices/ShowBaileysService";

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/** Normaliza número para apenas dígitos; tenta completar BR se faltou DDI/DD */
function normalizeNumber(raw: string, defaultCountry = "55"): string | null {
  if (!raw) return null;
  let n = (raw || "").replace(/[^\d]/g, "");
  if (!n) return null;

  // remove zeros à esquerda duplicados
  while (n.length > 0 && n[0] === "0") n = n.slice(1);

  // Se já tem DDI (>= 12 dígitos para BR com DDI + DDD + 9 dígitos)
  if (n.length >= 12) return n;

  // Heurística simples para BR:
  // 10~11 dígitos (DDD + número) -> adiciona DDI 55
  if (n.length === 10 || n.length === 11) return `${defaultCountry}${n}`;

  // 8~9 dígitos (sem DDD): mantemos (pode falhar no onWhatsApp)
  if (n.length === 8 || n.length === 9) return n;

  // Se vier com 12~14, já tratamos no primeiro if; demais casos: retorna o que tem
  return n;
}

/** Extrai números de um CSV/TXT */
function extractNumbersFromText(text: string): string[] {
  // aceita vírgula, ponto-e-vírgula ou quebras de linha
  const parts = text.split(/[\n\r;,]+/g).map(s => s.trim()).filter(Boolean);
  return parts;
}

/** Extrai números de um VCF (básico, sem lib externa) */
function extractNumbersFromVCF(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const nums: string[] = [];
  for (const line of lines) {
    // TEL;TYPE=CELL:+55 11 9 9876-5432  ou  TEL:+551198765432
    if (/^TEL[:;]/i.test(line)) {
      const m = line.split(":").pop();
      if (m) nums.push(m.trim());
    }
  }
  return nums;
}

/** Lê fallback de números em public/company{companyId}/agenda.(csv|txt|vcf) */
function readFallbackPhonebook(companyId: number): { source: string; numbers: string[] } {
  try {
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const companyFolder = path.join(publicFolder, `company${companyId}`);

    const tryFiles = [
      { name: "agenda.csv", parse: extractNumbersFromText },
      { name: "agenda.txt", parse: extractNumbersFromText },
      { name: "agenda.vcf", parse: extractNumbersFromVCF }
    ];

    for (const f of tryFiles) {
      const p = path.join(companyFolder, f.name);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        const rawNumbers = f.parse(content);
        return { source: p, numbers: rawNumbers };
      }
    }
  } catch (e) {
    logger.warn(`Falha ao ler fallback de agenda: ${(e as any)?.message}`);
  }
  return { source: "", numbers: [] };
}

const ImportContactsService = async (companyId: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  if (!defaultWhatsapp) {
    logger.error(
      `ImportContactsService: Nenhuma conexão padrão encontrada para company ${companyId}`
    );
    return;
  }

  // Aguarda a sessão ficar CONNECTED (máx ~12s)
  if (defaultWhatsapp.status !== "CONNECTED") {
    logger.warn(
      `ImportContactsService: conexão ${defaultWhatsapp.id} ainda não CONNECTED (status=${defaultWhatsapp.status}). Aguardando dump inicial...`
    );
    let tries = 12;
    while (tries-- > 0) {
      await sleep(1000);
      await defaultWhatsapp.reload();
      if (defaultWhatsapp.status === "CONNECTED") break;
    }
    if (defaultWhatsapp.status !== "CONNECTED") {
      logger.warn(
        `ImportContactsService: conexão ${defaultWhatsapp.id} não conectou a tempo. Abortando importação.`
      );
      return;
    }
  }

  const wbot = getWbot(defaultWhatsapp.id);

  let phoneContacts: any[] = []; // Inicializa como um array vazio

  // --- MÉTODO 1: Tenta pegar da memória (wbot.store) / cache interno ----
  try {
    // store (se existir)
    if ((wbot as any)?.store?.contacts) {
      phoneContacts = Object.values((wbot as any).store.contacts);
    }

    // cache interno (getKnownContacts) amplia com JIDs conhecidos
    const knownJids = getKnownContacts(defaultWhatsapp.id) || [];
    for (const jid of knownJids) {
      if (!phoneContacts.some((c: any) => c?.id === jid)) {
        phoneContacts.push({ id: jid });
      }
    }
  } catch (err) {
    logger.error(err, "Falha ao ler contatos do wbot.store/getKnownContacts");
  }

  // --- MÉTODO 2: Se a memória estiver vazia, tenta pegar do Banco de Dados ---
  if (phoneContacts.length === 0) {
    logger.warn(
      `wbot.store.contacts está vazio para o wbot ${defaultWhatsapp.id}. Tentando o banco de dados...`
    );
    try {
      const baileysData = await ShowBaileysService(defaultWhatsapp.id);
      if (baileysData && (baileysData as any).contacts) {
        const contactsData: any = (baileysData as any).contacts;
        if (isString(contactsData)) {
          phoneContacts = JSON.parse(contactsData);
        } else if (isArray(contactsData)) {
          phoneContacts = contactsData;
        } else if (typeof contactsData === "object") {
          phoneContacts = Object.values(contactsData);
        }
      }
    } catch (err) {
      logger.error(
        err,
        "Falha ao ler contatos do ShowBaileysService (banco de dados)"
      );
    }
  }

  // --- MÉTODO 3: “kick” + espera por crescimento do cache ---
  if (phoneContacts.length === 0) {
    logger.warn(
      `Nenhum contato encontrado (nem na memória, nem no DB) para o wbot ${defaultWhatsapp.id}. Forçando sincronização (kick) via helpers...`
    );

    try {
      const beforeKick = (getKnownContacts(defaultWhatsapp.id) || []).length;
      await ensureContactSyncKick(defaultWhatsapp.id);

      // Espera o cache crescer por até ~10s (20 x 500ms)
      let attempts = 20;
      let jids: string[] = [];
      while (attempts-- > 0) {
        jids = getKnownContacts(defaultWhatsapp.id) || [];
        if (jids.length > beforeKick) break;
        await sleep(500);
      }

      if (jids.length > 0) {
        phoneContacts = jids.map(jid => ({ id: jid }));
        logger.info(
          `Sincronização (kick) concluída. ${phoneContacts.length} JIDs conhecidos obtidos.`
        );
      } else {
        logger.info("Sincronização (kick) concluída. Nenhum novo JID conhecido obtido.");
      }
    } catch (err) {
      Sentry.captureException(err);
      logger.error(
        err,
        "Falha ao tentar popular contatos conhecidos (ensureContactSyncKick/getKnownContacts)"
      );
    }
  }

  // --- MÉTODO 4 (FALLBACK REAL DA AGENDA via arquivo) — protegido por flag ---
  if (phoneContacts.length === 0) {
    if (process.env.IMPORT_FALLBACK_FILE === "1") {
      const { source, numbers } = readFallbackPhonebook(companyId);
      if (numbers.length) {
        logger.warn(
          `Memória/DB vazios. Lendo fallback de agenda: ${source} (${numbers.length} números brutos).`
        );

        const uniqueNumbers = Array.from(new Set(numbers));
        const validJids: string[] = [];

        // Valida cada número no WhatsApp
        for (const raw of uniqueNumbers) {
          const norm = normalizeNumber(raw);
          if (!norm) continue;

          try {
            // Baileys aceita "onWhatsApp('5511999999999')" e/ou com sufixo @s.whatsapp.net
            const check = await (wbot as any).onWhatsApp(norm);
            // Estruturas possíveis de retorno:
            // - [{ jid: '5511...@s.whatsapp.net', exists: true }]
            // - [{ exists: true, jid: '...' }]
            let jid = "";
            if (Array.isArray(check) && check.length) {
              const item = check[0];
              if (item?.jid) jid = item.jid;
              else if (item?.exists) jid = `${norm}@s.whatsapp.net`;
            }
            if (jid && /@s\.whatsapp\.net$/.test(jid)) {
              validJids.push(jid);
            }
          } catch (e) {
            // ignora erro de verificação individual
            logger.warn(`onWhatsApp falhou para ${raw}: ${(e as any)?.message}`);
          }
        }

        phoneContacts = validJids.map(jid => ({ id: jid }));
        logger.info(`Fallback de agenda gerou ${phoneContacts.length} JIDs válidos no WhatsApp.`);
      } else {
        logger.warn(
          "Sem contatos em memória/DB e nenhum arquivo de fallback (agenda.csv/txt/vcf) encontrado."
        );
      }
    } else {
      logger.warn(
        "Memória/DB vazios e fallback por arquivo DESATIVADO (IMPORT_FALLBACK_FILE!=1). Use a importação por planilha do painel."
      );
      return;
    }
  }

  // Snapshot para debug
  try {
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const companyFolder = path.join(publicFolder, `company${companyId}`);
    if (!fs.existsSync(companyFolder)) {
      fs.mkdirSync(companyFolder, { recursive: true });
    }
    const beforeFilePath = path.join(companyFolder, "contatos_capturados.txt");
    fs.writeFile(
      beforeFilePath,
      JSON.stringify(phoneContacts, null, 2),
      (err) => {
        if (err) {
          logger.error(`Failed to write contacts to file: ${err}`);
        }
      }
    );
  } catch (e) {
    logger.warn(`Não foi possível salvar snapshot de contatos: ${(e as any)?.message}`);
  }

  if (phoneContacts.length === 0) {
    logger.warn(
      `Falha final: Nenhum contato encontrado/validado para o wbot ${defaultWhatsapp.id} após todas as tentativas.`
    );
    return;
  }

  logger.info(`Iniciando importação de ${phoneContacts.length} contatos...`);

  if (isArray(phoneContacts)) {
    const seen = new Set<string>();

    phoneContacts.forEach(async (c: any) => {
      const id: string | undefined = c?.id;
      const name: string | undefined = c?.name;
      const notify: string | undefined = c?.notify;

      if (
        !id ||
        id === "status@broadcast" ||
        id.includes("g.us") ||
        !id.includes("@s.whatsapp.net")
      ) {
        return;
      }

      if (seen.has(id)) return;
      seen.add(id);

      const number = id.replace(/\D/g, "");
      const contactName = (name || notify || number) as string;

      const existingContact = await Contact.findOne({
        where: { number, companyId }
      });

      if (existingContact) {
        if (existingContact.name !== contactName) {
          existingContact.name = contactName;
          await existingContact.save();
        }
      } else {
        try {
          await CreateContactService({
            number,
            name: contactName,
            companyId
          });
        } catch (error) {
          Sentry.captureException(error);
          logger.warn(`Could not create contact from phone. Err: ${error}`);
        }
      }
    });
  }
};

export default ImportContactsService;
