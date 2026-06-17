import { NextFunction, Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

// Listar mensagens de um ticket
messageRoutes.get("/messages/:ticketId", isAuth, MessageController.index);

// Enviar mensagem (com ou sem mídia)
messageRoutes.post(
  "/messages/:ticketId",
  isAuth,
  upload.array("medias"),
  MessageController.store
);

// Deletar mensagem
messageRoutes.delete(
  "/messages/:messageId",
  isAuth,
  MessageController.remove
);

// Editar mensagem
messageRoutes.post(
  "/messages/edit/:messageId",
  isAuth,
  MessageController.edit
);

// Contador de mensagens (relatório)
messageRoutes.get(
  "/messages-allMe",
  isAuth,
  MessageController.allMe
);

// 🔊 Transcrição de áudio
messageRoutes.get(
  "/messages/transcribeAudio/:fileName",
  isAuth,
  MessageController.transcribeAudioMessage
);

// Mensagem de lista
messageRoutes.post(
  "/messages/lista/:ticketId",
  isAuth,
  MessageController.sendListMessage
);

// Mensagem com botão de cópia
messageRoutes.post(
  "/messages/copy/:ticketId",
  isAuth,
  MessageController.sendCopyMessage
);

// Mensagem com botão de CALL
messageRoutes.post(
  "/messages/call/:ticketId",
  isAuth,
  MessageController.sendCALLMessage
);

// Mensagem com botão de URL
messageRoutes.post(
  "/messages/url/:ticketId",
  isAuth,
  MessageController.sendURLMessage
);

// Mensagem PIX (botão de copiar chave)
messageRoutes.post(
  "/messages/PIX/:ticketId",
  isAuth,
  MessageController.sendPIXMessage
);

// Encaminhar mensagem
messageRoutes.post(
  "/message/forward",
  isAuth,
  MessageController.forwardMessage
);

// Reações em mensagens
messageRoutes.post(
  "/messages/:messageId/reactions",
  isAuth,
  MessageController.addReaction
);

export default messageRoutes;
