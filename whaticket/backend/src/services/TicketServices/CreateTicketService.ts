import AppError from "../../errors/AppError";
import { Op } from "sequelize";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetDefaultWhatsAppByUser from "../../helpers/GetDefaultWhatsAppByUser";
import Ticket from "../../models/Ticket";
import ShowContactService from "../ContactServices/ShowContactService";
import { getIO } from "../../libs/socket";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import Queue from "../../models/Queue";
import User from "../../models/User";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import CreateLogTicketService from "./CreateLogTicketService";
import ShowTicketService from "./ShowTicketService";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  companyId: number;
  queueId?: number;
  whatsappId: string;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId,
  companyId,
  whatsappId = ""
}: Request): Promise<Ticket> => {

  const io = getIO();

  let whatsapp;
  let defaultWhatsapp

  if (whatsappId !== "undefined" && whatsappId !== null && whatsappId !== "") {
    whatsapp = await ShowWhatsAppService(whatsappId, companyId)
  }

  defaultWhatsapp = await GetDefaultWhatsAppByUser(userId);

  if (whatsapp) {
    defaultWhatsapp = whatsapp;
  }
  if (!defaultWhatsapp)
    defaultWhatsapp = await GetDefaultWhatsApp(whatsapp.id, companyId);

  // VERIFICAR SE JÁ EXISTE TICKET RECENTE PARA EVITAR MÚLTIPLOS MENUS
  const recentTicket = await Ticket.findOne({
    where: {
      contactId,
      companyId,
      whatsappId: defaultWhatsapp.id,
      createdAt: {
        [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Últimos 5 minutos
      }
    },
    order: [['createdAt', 'DESC']]
  });

  // Se já existe um ticket recente, retornar ele em vez de criar novo
  if (recentTicket) {
    return recentTicket;
  }

  // console.log("defaultWhatsapp", defaultWhatsapp.id, defaultWhatsapp.channel)
  await CheckContactOpenTickets(contactId, defaultWhatsapp.id, companyId);

  const { isGroup } = await ShowContactService(contactId, companyId);

  let ticket = await Ticket.create({
    contactId,
    companyId,
    whatsappId: defaultWhatsapp.id,
    channel: defaultWhatsapp.channel,
    isGroup,
    userId,
    isBot: true,
    queueId,
    status: isGroup ? "group" : "open",
    isActiveDemand: true
  });

  ticket = await ShowTicketService(ticket.id, companyId);

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  io.of(String(companyId))
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });

  await CreateLogTicketService({
    userId,
    queueId,
    ticketId: ticket.id,
    type: "create"
  });

  return ticket;
};

export default CreateTicketService;