import { Request, Response } from "express";
import logger from "../utils/logger";
import AppError from "../errors/AppError";
import ImportContactsFromWbot from "../services/WbotServices/ImportContactsService";

export const importAuto = async (req: Request, res: Response) => {
  // Permite usar :companyId na rota ou pegar do body/query
  const p = req.params?.companyId || req.body?.companyId || req.query?.companyId;
  const companyId = Number(p);

  if (!companyId || Number.isNaN(companyId)) {
    throw new AppError("Parâmetro companyId inválido.", 400);
  }

  logger.info(`[AutoImportContacts] Disparando importação para companyId=${companyId}`);

  // Chama o serviço que você já tem em WbotServices/ImportContactsService.ts
  await ImportContactsFromWbot(companyId);

  return res.json({
    ok: true,
    message: "Importação automática finalizada (veja os logs e o snapshot em public/companyX/contatos_capturados.txt).",
    companyId
  });
};

export default { importAuto };
