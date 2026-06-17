import moment from "moment";
import Ticket from "../../models/Ticket";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import UserRating from "../../models/UserRating";
import UpdateTicketService from "./UpdateTicketService"; // 1. IMPORTAR O SERVIÇO PRINCIPAL

/** Extrai a 1ª nota (0–10) presente no texto. */
function extractScore0to10(text: string): number | null {
  const s = (text || "").toString().trim();
  if (!s) return null;

  const tokens = s.match(/\b\d{1,2}\b/g);
  if (!tokens) return null;

  for (const t of tokens) {
    const n = Number(t);
    if (Number.isInteger(n) && n >= 0 && n <= 10) return n;
  }
  return null;
}

type Params = {
  ticket: Ticket;
  companyId: number;
  text: string | undefined | null;
};

const HandleNpsReplyService = async ({
  ticket,
  companyId,
  text
}: Params): Promise<boolean> => {
  const score = extractScore0to10(text || "");
  if (score === null) return false;

  const tracking = await FindOrCreateATicketTrakingService({
    ticketId: ticket.id,
    companyId,
    whatsappId: ticket.whatsappId
  });

  // Apenas processa se o ticket estava aguardando avaliação (status 'nps')
  if (ticket.status !== "nps") return false;
  if (tracking.rated) return true; // Já foi avaliado, apenas ignora a nova mensagem

  console.log(`[NPS] Storing score: ${score} for ticket ${ticket.id}`);

  // Salva a nota na tabela correta
  await UserRating.create({
    ticketId: ticket.id,
    companyId,
    userId: tracking.userId,
    rate: score
  });

  // Marca no tracking que já foi avaliado para não duplicar
  await tracking.update({
    rated: true
  });

  // 2. CHAMAR O SERVIÇO PRINCIPAL PARA FECHAR O TICKET CORRETAMENTE
  // Ele vai definir o status para "closed", salvar a data de fechamento e notificar a interface.
  await UpdateTicketService({
    ticketId: ticket.id,
    companyId: ticket.companyId,
    ticketData: {
      status: "closed",
      sendFarewellMessage: false // Impede o envio de mensagens de despedida duplicadas
    }
  });

  // (Opcional) Agradecer ao usuário
  try {
    if (ticket.channel === "whatsapp" && ticket.whatsapp?.status === "CONNECTED") {
      await SendWhatsAppMessage({
        body: "\u200eObrigado pela sua avaliação! 🙏",
        ticket
      });
    }
  } catch (err) {
    // ignora erros no envio do agradecimento
  }

  return true; // Finaliza o fluxo
};

export default HandleNpsReplyService;