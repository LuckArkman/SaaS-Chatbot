import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";

interface Request {
  contactId: string;
  companyId: string | number;
  active: boolean;
}

function formatBRNumber(jid: string) {
  // Se já for um JID completo, extrai apenas o número
  if (jid.includes("@")) {
    jid = jid.split("@")[0];
  }

  const regexp = new RegExp(/^(\d{2})(\d{2})\d{1}(\d{8})$/);
  if (regexp.test(jid)) {
    const match = regexp.exec(jid);
    if (match && match[1] === "55" && Number.isInteger(Number.parseInt(match[2]))) {
      const ddd = Number.parseInt(match[2]);
      if (ddd < 31) {
        return match[0];
      } else if (ddd >= 31) {
        return match[1] + match[2] + match[3];
      }
    }
  }
  return jid;
}

function createJid(number: string) {
  if (number.includes("@g.us") || number.includes("@s.whatsapp.net")) {
    return number; // Já está formatado, retorna como está
  }

  // Remove qualquer caractere não numérico
  const cleanNumber = number.replace(/\D/g, "");

  // Formata o número para o padrão brasileiro se necessário
  const formattedNumber = formatBRNumber(cleanNumber);

  return number.includes("-") || number.toLowerCase().includes("g.us")
    ? `${formattedNumber}@g.us`
    : `${formattedNumber}@s.whatsapp.net`;
}

const BlockUnblockContactService = async ({
  contactId,
  companyId,
  active
}: Request): Promise<Contact> => {
  // Validação do companyId
  if (!companyId) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 400);
  }

  const contact = await Contact.findOne({
    where: {
      id: contactId,
      companyId: Number(companyId)
    }
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  // Busca a conexão padrão do WhatsApp
  const whatsappCompany = await GetDefaultWhatsApp(Number(companyId));

  if (!whatsappCompany) {
    throw new AppError("ERR_NO_DEFAULT_WHATSAPP", 404);
  }

  // Verifica se o WhatsApp está conectado via model/status
  if (whatsappCompany.status !== "CONNECTED") {
    throw new AppError("ERR_WHATSAPP_NOT_CONNECTED", 400);
  }

  const wbot = getWbot(whatsappCompany.id);

  // Checagem opcional do WebSocket do Baileys, sem conflitar com o type Session
  // readyState === 1 -> OPEN
  const wsReady = (wbot as any)?.ws?.readyState;
  if (wsReady !== undefined && wsReady !== 1) {
    throw new AppError("ERR_WHATSAPP_SESSION_NOT_ACTIVE", 400);
  }

  const jid = createJid(contact.number);

  try {
    if (active) {
      // DESBLOQUEAR
      await (wbot as any).updateBlockStatus(jid, "unblock");
      await contact.update({ active: true });
    } else {
      // BLOQUEAR
      await (wbot as any).updateBlockStatus(jid, "block");
      await contact.update({ active: false });
    }

    // Recarrega o contato do banco para retornar os dados atualizados
    await contact.reload();

    return contact;
  } catch (error: any) {
    console.error("Erro ao bloquear/desbloquear contato:", error);

    // Tratamento específico para diferentes tipos de erro
    if (error?.message?.includes("not found")) {
      throw new AppError("ERR_CONTACT_NOT_FOUND_ON_WHATSAPP", 404);
    }

    if (error?.message?.includes("blocked")) {
      // Se já está bloqueado/desbloqueado, apenas atualiza o status local
      await contact.update({ active: !active });
      await contact.reload();
      return contact;
    }

    if (error?.message?.includes("connection")) {
      throw new AppError("ERR_WHATSAPP_CONNECTION_FAILED", 500);
    }

    // Erro genérico do WhatsApp
    throw new AppError(
      active ? "ERR_WPP_UNBLOCK_CONTACT" : "ERR_WPP_BLOCK_CONTACT",
      500
    );
  }
};

export default BlockUnblockContactService;
