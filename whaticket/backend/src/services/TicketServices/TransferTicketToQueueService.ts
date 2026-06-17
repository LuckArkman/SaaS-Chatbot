import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

interface TransferRequest {
  ticketId: number;
  companyId: number;
  queueId: number | null;
}

const TransferTicketToQueueService = async ({
  ticketId,
  companyId,
  queueId
}: TransferRequest): Promise<Ticket> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId }
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Atualiza as informações do ticket
  await ticket.update({
    queueId,
    status: "pending", // <-- fica como AGUARDANDO
    userId: null,      // <-- libera para qualquer atendente da fila
    flowStopped: null,
    flowWebhook: false,
    lastFlowId: null
  });

  // Garante que estamos emitindo o ticket mais atualizado possível
  await ticket.reload();

  // Emite atualização em tempo real
  const io = getIO();
  io.to(String(companyId)).emit("ticket:update", {
    action: "update",
    ticket
  });

  return ticket;
};

export default TransferTicketToQueueService;
