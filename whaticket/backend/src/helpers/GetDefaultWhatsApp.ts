import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import GetDefaultWhatsAppByUser from "./GetDefaultWhatsAppByUser";

const GetDefaultWhatsApp = async (
  companyId: number | null,
  whatsappId?: number,
  userId?: number
): Promise<Whatsapp> => {
  console.log("[GetDefaultWhatsApp] called with:", {
    companyId,
    whatsappId,
    userId
  });

  // Vamos trabalhar com um companyId "resolvido"
  let resolvedCompanyId: number | null = companyId ?? null;

  // 🔹 Tentativa 1: se não veio companyId mas veio whatsappId,
  // tentar descobrir a empresa pelo próprio WhatsApp
  if ((!resolvedCompanyId || resolvedCompanyId === 0) && whatsappId) {
    try {
      const wpp = await Whatsapp.findByPk(whatsappId);

      if (wpp && wpp.companyId) {
        resolvedCompanyId = Number(wpp.companyId);
        console.log(
          "[GetDefaultWhatsApp] resolved companyId from whatsappId:",
          { resolvedCompanyId, whatsappId, userId }
        );
      } else {
        console.warn(
          "[GetDefaultWhatsApp] could not resolve companyId from whatsappId:",
          { whatsappId, wpp }
        );
      }
    } catch (error) {
      console.error(
        "[GetDefaultWhatsApp] error resolving companyId from whatsappId:",
        { whatsappId, error }
      );
    }
  }

  // 🔹 A PARTIR DAQUI: NÃO vamos mais quebrar se o companyId for nulo.
  // Em vez disso, usaremos ele quando existir, e quando não existir
  // cairemos para um fallback global (qualquer WhatsApp conectado).

  let connection: Whatsapp | null = null;

  // Primeira tentativa: Buscar pelo whatsappId específico se fornecido
  if (whatsappId) {
    const whereById: any = {
      id: whatsappId,
      status: "CONNECTED" // Garantir que está conectado
    };

    if (resolvedCompanyId) {
      whereById.companyId = resolvedCompanyId;
    }

    connection = await Whatsapp.findOne({
      where: whereById
    });

    if (connection) {
      console.log(
        `[GetDefaultWhatsApp] Found WhatsApp by ID: ${whatsappId} ${
          resolvedCompanyId
            ? `for company ${resolvedCompanyId}`
            : "(no company filter)"
        }`
      );
      return connection;
    }
  }

  // Segunda tentativa: Buscar WhatsApp padrão da empresa (se soubermos a empresa)
  if (!connection && resolvedCompanyId) {
    connection = await Whatsapp.findOne({
      where: {
        status: "CONNECTED",
        companyId: resolvedCompanyId,
        isDefault: true
      }
    });

    if (connection) {
      console.log(
        `[GetDefaultWhatsApp] Found default WhatsApp for company: ${resolvedCompanyId}`
      );
      return connection;
    }
  }

  // Terceira tentativa: Buscar qualquer WhatsApp conectado da empresa (se soubermos a empresa)
  if (!connection && resolvedCompanyId) {
    connection = await Whatsapp.findOne({
      where: {
        status: "CONNECTED",
        companyId: resolvedCompanyId
      },
      order: [["isDefault", "DESC"], ["updatedAt", "DESC"]] // Prioriza o padrão e depois o mais recente
    });

    if (connection) {
      console.log(
        `[GetDefaultWhatsApp] Found any connected WhatsApp for company: ${resolvedCompanyId}`
      );
      return connection;
    }
  }

  // Quarta tentativa: Se temos userId, buscar WhatsApp do usuário (e filtrar pela empresa, se soubermos)
  if (!connection && userId) {
    try {
      const userConnection = await GetDefaultWhatsAppByUser(userId);

      if (
        userConnection &&
        userConnection.status === "CONNECTED" &&
        (!resolvedCompanyId || userConnection.companyId === resolvedCompanyId)
      ) {
        console.log(
          `[GetDefaultWhatsApp] Found WhatsApp by user: ${userId} ${
            resolvedCompanyId
              ? `for company ${resolvedCompanyId}`
              : "(no company filter)"
          }`
        );
        return userConnection;
      }
    } catch (error) {
      console.log(
        `[GetDefaultWhatsApp] Error getting WhatsApp by user ${userId}:`,
        error
      );
      // Continua para próxima tentativa
    }
  }

  // Quinta tentativa (nova): Fallback global - qualquer WhatsApp conectado,
  // independente de empresa (para evitar quebrar fluxo quando companyId vem nulo).
  if (!connection) {
    connection = await Whatsapp.findOne({
      where: {
        status: "CONNECTED"
      },
      order: [
        ["isDefault", "DESC"],
        ["updatedAt", "DESC"]
      ]
    });

    if (connection) {
      console.warn(
        "[GetDefaultWhatsApp] Fallback global: using any CONNECTED WhatsApp without reliable companyId. Chosen:",
        {
          id: connection.id,
          name: connection.name,
          companyId: connection.companyId
        }
      );
      return connection;
    }
  }

  // Última tentativa: Buscar qualquer WhatsApp da empresa (mesmo desconectado), se soubermos a empresa
  if (!connection && resolvedCompanyId) {
    connection = await Whatsapp.findOne({
      where: { companyId: resolvedCompanyId },
      order: [
        ["status", "DESC"], // Prioriza CONNECTED
        ["isDefault", "DESC"],
        ["updatedAt", "DESC"]
      ]
    });

    if (connection) {
      console.log(
        `[GetDefaultWhatsApp] Found any WhatsApp (including disconnected) for company: ${resolvedCompanyId}`
      );
      return connection;
    }
  }

  // Se nenhum WhatsApp foi encontrado de jeito nenhum
  console.error(
    "[GetDefaultWhatsApp] ERR_NO_DEF_WAPP_FOUND - no WhatsApp connection found",
    {
      resolvedCompanyId,
      originalCompanyId: companyId,
      whatsappId,
      userId
    }
  );

  throw new AppError(
    `ERR_NO_DEF_WAPP_FOUND in COMPANY ${
      resolvedCompanyId ?? "UNKNOWN"
    } - No WhatsApp connection found`,
    400
  );
};

export default GetDefaultWhatsApp;
