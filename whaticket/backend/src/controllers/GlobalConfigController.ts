// ARQUIVO: backend/src/controllers/GlobalConfigController.ts

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import GetGlobalConfig from "../helpers/GetGlobalConfig";
import Company from "../models/Company";
import Setting from "../models/Setting";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user as any;

  const config = await GetGlobalConfig(companyId);

  return res.status(200).json(config);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // pegamos tudo em "any" pra não brigar com o TS
  const { companyId, profile } = req.user as any;
  const isSuper = !!(req.user as any)?.super;

  // ✅ Permite: super OU admin da empresa 1
  if (!req.user || (!isSuper && !(profile === "admin" && Number(companyId) === 1))) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const {
    mpAccessToken,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    trialExpiration,

    // ✅ NOVOS CAMPOS DE LOGIN / BRANDING
    loginLogo,
    loginBackground,
    loginWhatsapp
  } = req.body;

  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  // --- Atualiza MP + SMTP na Company (igual já foi feito) ---
  if (typeof mpAccessToken !== "undefined") {
    (company as any).mpAccessToken = mpAccessToken;
  }
  if (typeof smtpHost !== "undefined") {
    (company as any).smtpHost = smtpHost;
  }
  if (typeof smtpPort !== "undefined") {
    (company as any).smtpPort = smtpPort;
  }
  if (typeof smtpSecure !== "undefined") {
    (company as any).smtpSecure = smtpSecure;
  }
  if (typeof smtpUser !== "undefined") {
    (company as any).smtpUser = smtpUser;
  }
  if (typeof smtpPass !== "undefined") {
    (company as any).smtpPass = smtpPass;
  }
  if (typeof smtpFrom !== "undefined") {
    (company as any).smtpFrom = smtpFrom;
  }

  // --- TrialExpiration: grava também na Company + Setting global + process.env ---
  if (typeof trialExpiration !== "undefined") {
    const numericTrial = parseInt(String(trialExpiration), 10);

    if (!Number.isNaN(numericTrial) && numericTrial > 0) {
      // salva na Company (pra GetGlobalConfig enxergar)
      (company as any).trialExpiration = numericTrial;

      // 🔥 Limpa todos os APP_TRIALEXPIRATION antigos
      await Setting.destroy({
        where: { companyId: 1, key: "APP_TRIALEXPIRATION" }
      });

      // Cria um único registro novo com o valor atual
      await Setting.create({
        companyId: 1,
        key: "APP_TRIALEXPIRATION",
        value: String(numericTrial)
      } as any);

      // Atualiza o valor em runtime também (usado no UserController, etc.)
      process.env.APP_TRIALEXPIRATION = String(numericTrial);
    }
  }

  await company.save();

  // === NOVO: salvar logo, capa e WhatsApp do login em Settings ===
  const upsertIfDefined = async (key: string, value: any) => {
    if (typeof value === "undefined" || value === null) return;
    await Setting.upsert({
      companyId,
      key,
      value: String(value)
    } as any);
  };

  await upsertIfDefined("LOGIN_LOGO_URL", loginLogo);
  await upsertIfDefined("LOGIN_BACKGROUND_URL", loginBackground);
  await upsertIfDefined("LOGIN_WHATSAPP_URL", loginWhatsapp);

  const config = await GetGlobalConfig(companyId);
  return res.status(200).json(config);
};

// 🔹 NOVO: upload de arquivos (logo/capa) para o login
export const uploadBrandingImage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile } = req.user as any;
  const isSuper = !!(req.user as any)?.super;

  if (!req.user || (!isSuper && !(profile === "admin" && Number(companyId) === 1))) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (!req.file) {
    throw new AppError("ERR_NO_FILE", 400);
  }

  const { field } = req.body;

  if (!["loginLogo", "loginBackground"].includes(field)) {
    throw new AppError("ERR_INVALID_FIELD", 400);
  }

  /**
   * Aqui assumo que o multer já está configurado com `dest: 'public/'`
   * ou algo como `public/branding`.
   *
   * Exemplos de caminhos possíveis:
   *  - public/branding/1699999999999-logo.png
   *  - public/1699999999999-capa.jpg
   */
  const originalPath = req.file.path || "";
  // normaliza para começar em "public/..."
  const relativePath = originalPath.replace(/.*public[\\/]/, "public/").replace(/\\/g, "/");

  // Vamos devolver uma URL relativa; o frontend prefixa com REACT_APP_BACKEND_URL
  return res.status(200).json({
    field,
    url: `/${relativePath}`
  });
};

// 🔹 NOVO: endpoint público só para o branding do login
export const publicBranding = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // aqui uso a company 1 como padrão; se depois quiser multi-tenant, dá pra evoluir
    const config: any = await GetGlobalConfig(1);

    // 🔹 Valores padrão caso ainda não tenha nada salvo no banco
    const defaultLoginLogo = "/public/branding/login-logo-default.png";
    const defaultLoginBackground = "/public/branding/login-background-default.png";
    const defaultLoginWhatsapp = "https://wa.me/5511000000000";

    return res.status(200).json({
      loginLogo: config?.loginLogo || defaultLoginLogo,
      loginBackground: config?.loginBackground || defaultLoginBackground,
      loginWhatsapp: config?.loginWhatsapp || defaultLoginWhatsapp
    });
  } catch (err) {
    console.error("[GlobalConfigController.publicBranding] erro:", err);
    return res.status(500).json({ error: "ERR_GLOBAL_CONFIG" });
  }
};
