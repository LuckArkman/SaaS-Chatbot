import { WASocket } from "baileys";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";

type Session = WASocket & {
  id?: number;
};

const GetTicketWbot = async (ticket: Ticket): Promise<Session> => {
  // Se o ticket ainda não tem whatsappId, define o padrão da empresa
  if (!ticket.whatsappId) {
    const defaultWhatsapp = await GetDefaultWhatsApp(
      ticket.whatsappId,
      ticket.companyId
    );

    await ticket.$set("whatsapp", defaultWhatsapp);
  }

  // 🔒 Blindagem: garante que o whatsapp usado é da MESMA empresa do ticket
  const whatsapp = await Whatsapp.findOne({
    where: {
      id: ticket.whatsappId,
      companyId: ticket.companyId
    }
  });

  if (!whatsapp) {
    // Se cair aqui, temos um ticket apontando para um WhatsApp de outra empresa
    throw new AppError("ERR_WHATSAPP_NOT_FOUND_FOR_COMPANY");
  }

  const wbot = getWbot(ticket.whatsappId) as Session;

  if (!wbot) {
    throw new AppError("ERR_WAPP_SESSION_NOT_FOUND");
  }

  return wbot;
};

export default GetTicketWbot;
