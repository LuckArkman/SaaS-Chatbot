import fs from "fs";
import path from "path";
import Baileys from "../../models/Baileys";
import Whatsapp from "../../models/Whatsapp";

const DeleteBaileysService = async (id: string | number): Promise<void> => {
  const whatsappId = Number(id);

  if (Number.isNaN(whatsappId)) {
    console.error("[DeleteBaileysService] ID inválido para WhatsApp:", id);
    return;
  }

  // 🔹 Buscar WhatsApp para obter informações auxiliares (ex.: companyId) e atualizar status depois
  let whatsapp: Whatsapp | null = null;
  try {
    whatsapp = await Whatsapp.findByPk(whatsappId);
  } catch (err) {
    console.error("[DeleteBaileysService] Erro ao buscar WhatsApp por ID:", err);
  }

  // 🔹 Em vez de apagar o registro na tabela Baileys, garantimos que ele exista
  //    Isso evita o 404 (ERR_NO_BAILEYS_DATA_FOUND) em serviços que esperam a linha sempre presente.
  try {
    let baileysData = await Baileys.findOne({
      where: { whatsappId }
    });

    if (!baileysData) {
      // cria linha mínima; se houver companyId no WhatsApp, aproveita
      const payload: any = { whatsappId };
      if (whatsapp && (whatsapp as any).companyId) {
        payload.companyId = (whatsapp as any).companyId;
      }

      await Baileys.create(payload);
      console.log(
        `[DeleteBaileysService] Registro Baileys criado (ensure) para whatsappId=${whatsappId}`
      );
    } else {
      // opcionalmente, podemos "tocar" o updatedAt para sinalizar limpeza de sessão.
      await (baileysData as any).update({});
      console.log(
        `[DeleteBaileysService] Registro Baileys preservado (não destruído) para whatsappId=${whatsappId}`
      );
    }
  } catch (err) {
    console.error("[DeleteBaileysService] Erro ao garantir registro em Baileys:", err);
  }

  // 🔹 Remover pasta de autenticação da sessão no disco
  try {
    // ⚠️ IMPORTANTE: este caminho deve ser o mesmo usado no initWASocket/wbot.ts
    const sessionDir = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "sessions",
      String(whatsappId)
    );

    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[DeleteBaileysService] Pasta de sessão removida: ${sessionDir}`);
    } else {
      console.log(
        `[DeleteBaileysService] Pasta de sessão não encontrada: ${sessionDir}`
      );
    }
  } catch (err) {
    console.error("[DeleteBaileysService] Erro ao remover pasta de sessão Baileys:", err);
  }

  // 🔹 Marcar a conexão como desconectada (ajuda o painel a exibir o status correto)
  try {
    if (whatsapp) {
      await whatsapp.update({ status: "DISCONNECTED" });
      console.log(
        `[DeleteBaileysService] Status do WhatsApp ${whatsappId} atualizado para DISCONNECTED`
      );
    }
  } catch (err) {
    console.error("[DeleteBaileysService] Erro ao atualizar status do WhatsApp:", err);
  }
};

export default DeleteBaileysService;
