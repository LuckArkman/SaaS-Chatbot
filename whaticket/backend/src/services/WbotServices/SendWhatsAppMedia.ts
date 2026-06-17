// src/services/WbotServices/SendWhatsAppMedia.ts
import { WAMessage, AnyMessageContent } from "baileys";
import * as Sentry from "@sentry/node";
import fs, { unlinkSync } from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import mime from "mime-types";
import Contact from "../../models/Contact";
import { getWbot } from "../../libs/wbot";
import CreateMessageService from "../MessageServices/CreateMessageService";
import formatBody from "../../helpers/Mustache";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  companyId?: number;
  body?: string;
  isPrivate?: boolean;
  isForwarded?: boolean;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

// Garante pasta da empresa
const ensureCompanyFolder = (companyId: string) => {
  const dir = path.join(publicFolder, `company${companyId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// Heurística: alguns recipientes (ex.: .mpeg, .webm) podem vir como "video/*" mas serem usados como áudio.
// Aqui decidimos extrair o áudio e mandar como PTT nesses casos.
const looksLikeAudioContainer = (ext: string, mimetype: string) => {
  const e = ext.toLowerCase();
  const mt = (mimetype || "").toLowerCase();
  if (mt.startsWith("audio/")) return true;

  // Trata .mpeg/.mpg (muito comum o usuário enviar “Arquivo MPEG (.mpeg)” achando que é áudio)
  if (e === ".mpeg" || e === ".mpg") return true;

  // Gravações web via navegador costumam vir em webm (com áudio Opus). Se quiser sempre PTT, trate como áudio:
  if (e === ".webm" && mt.includes("webm")) return true;

  // Outros formatos de áudio comuns:
  if ([".mp3", ".m4a", ".aac", ".wav", ".oga", ".ogg"].includes(e)) return true;

  return false;
};

// Converte QUALQUER input para OGG/Opus 48k mono (excelente para WhatsApp PTT)
const processAudioToOpus = async (inputPath: string, companyId: string): Promise<string> => {
  const dir = ensureCompanyFolder(companyId);
  const outputPath = path.join(dir, `${Date.now()}.ogg`);

  const cmd =
    `"${ffmpegPath.path}" -y -i "${inputPath}" ` +
    `-vn -ar 48000 -ac 1 -c:a libopus -b:a 48k "${outputPath}"`;

  return new Promise((resolve, reject) => {
    exec(cmd, (error) => (error ? reject(error) : resolve(outputPath)));
  });
};

// Também usado por filas/rotas externas
export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  companyId?: string,
  body: string = " "
): Promise<AnyMessageContent | null> => {
  const mimeType = mime.lookup(pathMedia) || "";
  const ext = path.extname(pathMedia || fileName || "").toLowerCase();

  try {
    let options: AnyMessageContent;

    if (looksLikeAudioContainer(ext, mimeType)) {
      const converted = await processAudioToOpus(pathMedia, companyId || "0");
      options = {
        audio: fs.readFileSync(converted),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      };
      // opcional: apagar o convertido se não quiser manter
      // unlinkSync(converted);
    } else if (mimeType.startsWith("video/")) {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body || undefined,
        fileName
      };
    } else if (
      mimeType.startsWith("application/") ||
      mimeType.startsWith("text/") ||
      mimeType === "application/pdf"
    ) {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body || undefined,
        fileName,
        mimetype: mimeType
      };
    } else {
      // imagem (png/jpg/webp/gif…)
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body || undefined
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body = "",
  isPrivate = false,
  isForwarded = false
}: Request): Promise<WAMessage> => {
  try {
    const wbot = await getWbot(ticket.whatsappId);
    const companyId = ticket.companyId.toString();

    const pathMedia = media.path;
    const mimeType = media.mimetype || "";
    const ext = path.extname(media.originalname || pathMedia || "").toLowerCase();
    let options: AnyMessageContent;
    const bodyMedia = ticket ? formatBody(body, ticket) : body;

    if (looksLikeAudioContainer(ext, mimeType)) {
      // Converte e envia como PTT
      const converted = await processAudioToOpus(pathMedia, companyId);
      options = {
        audio: fs.readFileSync(converted),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
        // caption em PTT geralmente não aparece; opcional manter fora
        contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded }
      };
      // limpa arquivo convertido
      unlinkSync(converted);
    } else if (mimeType.startsWith("video/")) {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: bodyMedia || undefined,
        fileName: media.originalname.replace("/", "-"),
        contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded }
      };
    } else if (
      mimeType.startsWith("application/") ||
      mimeType.startsWith("text/") ||
      mimeType === "application/pdf"
    ) {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMedia || undefined,
        fileName: media.originalname.replace("/", "-"),
        mimetype: mimeType,
        contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded }
      };
    } else {
      // imagem
      if (mimeType.includes("gif")) {
        options = {
          image: fs.readFileSync(pathMedia),
          caption: bodyMedia || undefined,
          mimetype: "image/gif",
          gifPlayback: true,
          contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded }
        };
      } else {
        options = {
          image: fs.readFileSync(pathMedia),
          caption: bodyMedia || undefined,
          contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded }
        };
      }
    }

    // Apenas registrar no banco (mensagem privada)
if (isPrivate === true) {
  const baseType = media.mimetype?.split("/")[0] ?? "document";

  const messageData = {
    wid: `PVT${companyId}${ticket.id}${(body || "").substring(0, 6)}`,
    ticketId: ticket.id,
    contactId: undefined,
    body: bodyMedia,
    fromMe: true,
    mediaUrl: media.filename,
    mediaType: baseType,
    read: true,
    quotedMsgId: null,
    ack: 1,
    remoteJid: null,
    participant: null,
    dataJson: null,
    ticketTrakingId: null,
    isPrivate
  };

  await CreateMessageService({ messageData, companyId: ticket.companyId });

  // Retorna um stub apenas para satisfazer a assinatura (quem chama não usa esse retorno)
  return {} as unknown as WAMessage;
}


    // Descobre o JID do contato
    const contactNumber = await Contact.findByPk(ticket.contactId);
    let number: string;

    if (
      contactNumber?.remoteJid &&
      contactNumber.remoteJid !== "" &&
      contactNumber.remoteJid.includes("@")
    ) {
      number = contactNumber.remoteJid;
    } else {
      number = `${contactNumber?.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    }

    // Envia
    const sentMessage = await wbot.sendMessage(number, { ...options });

    await ticket.update({
      lastMessage: body && body !== media.filename ? body : bodyMedia,
      imported: null
    });

    return sentMessage;
  } catch (err) {
    console.log(`ERRO AO ENVIAR MIDIA ${ticket.id} media ${media.originalname}`);
    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
