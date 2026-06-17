// ARQUIVO: backend/src/helpers/GetGlobalConfig.ts

import { isNil } from "lodash";
import Company from "../models/Company";
import Setting from "../models/Setting";

export interface GlobalConfig {
  mpAccessToken: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  trialExpiration: string;

  // 🔹 NOVOS CAMPOS PARA LOGIN / BRANDING
  loginLogo: string;
  loginBackground: string;
  loginWhatsapp: string;
}

/**
 * Lê configurações globais da plataforma.
 *
 * Prioridade:
 * 1) Campos gravados na Company (normalmente companyId = 1, conta principal)
 * 2) Settings (APP_TRIALEXPIRATION + LOGIN_*_URL)
 * 3) Variáveis de ambiente (.env)
 */
const GetGlobalConfig = async (companyId?: number): Promise<GlobalConfig> => {
  // 1) Valores base vindos do .env
  let config: GlobalConfig = {
    mpAccessToken: process.env.MP_ACCESS_TOKEN || "",
    smtpHost: process.env.MAIL_HOST || "",
    smtpPort: process.env.MAIL_PORT || "",
    smtpSecure: process.env.MAIL_SECURE || "false",
    smtpUser: process.env.MAIL_USER || "",
    smtpPass: process.env.MAIL_PASS || "",
    smtpFrom: process.env.MAIL_FROM || "",
    trialExpiration: process.env.APP_TRIALEXPIRATION || "3",

    // defaults vazios, frontend faz fallback (/logo.png, capa padrão, etc.)
    loginLogo: "",
    loginBackground: "",
    loginWhatsapp: ""
  };

  // 2) Sobrescreve com o que estiver salvo na Company (global)
  const companyConfigId = companyId || 1; // normalmente a empresa 1 é a "mãe"
  try {
    const company = await Company.findByPk(companyConfigId);

    if (company) {
      const c: any = company;

      config = {
        ...config,
        mpAccessToken: !isNil(c.mpAccessToken)
          ? String(c.mpAccessToken)
          : config.mpAccessToken,
        smtpHost: !isNil(c.smtpHost) ? String(c.smtpHost) : config.smtpHost,
        smtpPort: !isNil(c.smtpPort) ? String(c.smtpPort) : config.smtpPort,
        smtpSecure: !isNil(c.smtpSecure)
          ? String(c.smtpSecure)
          : config.smtpSecure,
        smtpUser: !isNil(c.smtpUser) ? String(c.smtpUser) : config.smtpUser,
        smtpPass: !isNil(c.smtpPass) ? String(c.smtpPass) : config.smtpPass,
        smtpFrom: !isNil(c.smtpFrom) ? String(c.smtpFrom) : config.smtpFrom,

        // lê também trialExpiration salvo na Company, se existir
        trialExpiration: !isNil(c.trialExpiration)
          ? String(c.trialExpiration)
          : config.trialExpiration
      };
    }
  } catch (err) {
    console.warn("[GetGlobalConfig] Erro ao carregar Company:", err);
  }

  // 3) TrialExpiration vindo de Setting, se existir
  try {
    const setting = await Setting.findOne({
      where: { companyId: 1, key: "APP_TRIALEXPIRATION" },
      // 🔑 Pega SEMPRE o mais recente (id/updatedAt maior)
      order: [["updatedAt", "DESC"], ["id", "DESC"]]
    });

    if (setting && !isNil(setting.value)) {
      config.trialExpiration = String(setting.value);
    }
  } catch (err) {
    console.warn(
      "[GetGlobalConfig] Erro ao carregar Setting APP_TRIALEXPIRATION:",
      err
    );
  }

  // 4) 🔹 NOVO: Login logo, background e WhatsApp vindos de Settings
  try {
    const brandingSettings = await Setting.findAll({
      where: {
        companyId: companyConfigId,
        key: [
          "LOGIN_LOGO_URL",
          "LOGIN_BACKGROUND_URL",
          "LOGIN_WHATSAPP_URL"
        ]
      }
    });

    const map: Record<string, string> = {};
    brandingSettings.forEach((s: any) => {
      if (!isNil(s.value)) {
        map[s.key] = String(s.value);
      }
    });

    config = {
      ...config,
      loginLogo: !isNil(map.LOGIN_LOGO_URL)
        ? map.LOGIN_LOGO_URL
        : config.loginLogo,
      loginBackground: !isNil(map.LOGIN_BACKGROUND_URL)
        ? map.LOGIN_BACKGROUND_URL
        : config.loginBackground,
      loginWhatsapp: !isNil(map.LOGIN_WHATSAPP_URL)
        ? map.LOGIN_WHATSAPP_URL
        : config.loginWhatsapp
    };
  } catch (err) {
    console.warn(
      "[GetGlobalConfig] Erro ao carregar Settings de LOGIN_*_URL:",
      err
    );
  }

  return config;
};

export default GetGlobalConfig;
