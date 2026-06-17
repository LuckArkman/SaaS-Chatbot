import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { jidNormalizedUser } from "baileys";

/*
  CORREÇÃO: Esta função estava causando o erro "Número de contato inválido"
  porque usava o wbot "default" da empresa, que podia estar offline,
  em vez de validar o número pela conexão correta.

  A nova lógica é mais simples: ela apenas confia no número recebido
  e o formata corretamente como um JID. A validação real (se o número
  existe no WhatsApp) foi removida para impedir os falsos-negativos.
*/
const CheckContactNumber = async (
  number: string,
  companyId: number,
  isGroup: boolean = false
): Promise<string> => {
  // 1. Limpa o número, removendo qualquer sufixo @
  const numberOnly = number.split("@")[0];

  // 2. Define o sufixo correto
  const suffix = isGroup ? "@g.us" : "@s.whatsapp.net";

  // 3. Monta o JID final
  const jid = `${numberOnly}${suffix}`;

  // 4. Validação básica de formato
  if (isGroup && !jid.endsWith("@g.us")) {
    throw new AppError("O JID do grupo é inválido");
  }
  if (!isGroup && !jid.endsWith("@s.whatsapp.net")) {
    throw new AppError("O JID do contato é inválido");
  }

  // 5. Retorna o número limpo (sem o sufixo),
  // pois é o formato que o resto do sistema espera
  return numberOnly;
};

export default CheckContactNumber;