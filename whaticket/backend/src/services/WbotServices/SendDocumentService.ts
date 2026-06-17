// src/services/WbotServices/SendDocumentService.ts

import { WAMessage, AnyMessageContent } from "baileys";
import fs from "fs";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string; // Legenda/corpo da mensagem
}

const SendDocumentService = async ({
  media,
  ticket,
  body = ""
}: Request): Promise<WAMessage> => {
  try {
    const wbot = await GetTicketWbot(ticket);

    // Monta o objeto de opções para a biblioteca Baileys
    // Esta é a forma correta e robusta de enviar um documento.
    const options: AnyMessageContent = {
      document: fs.readFileSync(media.path),
      fileName: media.originalname, // Nome original do arquivo
      mimetype: media.mimetype,     // Tipo do arquivo (ex: application/pdf)
      caption: body                 // Legenda que acompanha o documento
    };

    const contactNumber = `${ticket.contact.number}@${
      ticket.isGroup ? "g.us" : "s.whatsapp.net"
    }`;

    const sentMessage = await wbot.sendMessage(contactNumber, options);
    
    // Atualiza o ticket com a última mensagem
    await ticket.update({ lastMessage: media.originalname });

    return sentMessage;

  } catch (err) {
    console.error("Erro dentro do SendDocumentService:", err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  } finally {
    // Bloco ESSENCIAL: apaga o arquivo temporário do servidor após o envio.
    // Isso impede que seu disco fique cheio.
    if (fs.existsSync(media.path)) {
      fs.unlinkSync(media.path);
    }
  }
};

export default SendDocumentService;