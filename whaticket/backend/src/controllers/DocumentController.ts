// src/controllers/DocumentController.ts

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import SendDocumentService from "../services/WbotServices/SendDocumentService"; // Vamos criar este serviço

export const send = async (req: Request, res: Response): Promise<Response> => {
  // Pegamos o ID do ticket e a legenda do corpo da requisição
  const { ticketId, caption } = req.body;
  // Pegamos o arquivo que foi upado pelo multer
  const file = req.file as Express.Multer.File;

  // Validação básica
  if (!file) {
    throw new AppError("Nenhum arquivo de documento foi enviado.", 400);
  }

  if (!ticketId) {
    throw new AppError("O ID do ticket é obrigatório.", 400);
  }

  try {
    // Buscamos os dados do ticket para garantir que ele existe
    const ticket = await ShowTicketService(ticketId, req.user.companyId);

    console.log(`Iniciando envio de documento para o ticket ${ticketId}`);

    // Chamamos o serviço que fará o envio
    await SendDocumentService({
      media: file,
      ticket: ticket,
      body: caption // Passa a legenda para o corpo da mensagem
    });
    
    console.log(`Documento enviado com sucesso para o ticket ${ticketId}`);
    return res.status(200).json({ message: "Documento enviado com sucesso." });

  } catch (err: any) {
    console.error("Erro no DocumentController:", err);
    throw new AppError(err.message || "Erro ao enviar o documento.", 500);
  }
};