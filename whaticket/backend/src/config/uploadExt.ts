import path from "path";
import multer from "multer";
import { Request } from "express";

// Lista de todos os tipos de arquivo que o seu sistema poderá aceitar
const allowedMimes = [
  "application/pdf",                                                  // PDF
  "application/vnd.ms-excel",                                         // Excel antigo (.xls)
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  // Excel novo (.xlsx)
  "text/csv",                                                         // CSV
  "application/msword",                                               // Word antigo (.doc)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word novo (.docx)
  "image/png",
  "image/jpeg",
  "image/gif",
  "video/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus"
];

const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,

  storage: multer.diskStorage({
    destination: publicFolder,
    filename: (req, file, cb) => {
      // Lógica simplificada e segura para nomear arquivos
      // Resultado: 1691550000000-nome-original-do-arquivo.pdf
      const uniquePrefix = new Date().getTime();
      const finalName = `${uniquePrefix}-${decodeURI(file.originalname).replace(/\s/g, "_")}`;
      cb(null, finalName);
    }
  }),

  // Seção adicionada para validar o tipo do arquivo
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimes.includes(file.mimetype)) {
      // Se o tipo do arquivo estiver na lista, permite o upload
      cb(null, true);
    } else {
      // Se não estiver, rejeita o upload com uma mensagem de erro
      cb(new Error("Tipo de arquivo não permitido."));
    }
  }
};