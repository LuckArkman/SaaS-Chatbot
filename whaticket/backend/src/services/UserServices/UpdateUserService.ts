// ARQUIVO COMPLETO E CORRIGIDO: backend/src/services/UserServices/UpdateUserService.ts

import * as Yup from "yup";

import AppError from "../../errors/AppError";
import ShowUserService from "./ShowUserService";
import Company from "../../models/Company";
import User from "../../models/User";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  companyId?: number;
  queueIds?: number[];
  startWork?: string;
  endWork?: string;
  farewellMessage?: string;
  whatsappId?: number | null;
  allTicket?: string;
  defaultTheme?: string;
  defaultMenu?: string;
  allowGroup?: boolean;
  allHistoric?: string;
  allUserChat?: string;
  userClosePendingTicket?: string;
  showDashboard?: string;
  defaultTicketsManagerWidth?: number;
  allowRealTime?: string;
  allowConnections?: string;
  profileImage?: string;
  language?: string; // Adicionado para garantir que o idioma seja atualizado
  canViewAllContacts?: boolean;
}

interface UpdateUserRequest {
  userData: UserData;
  userId: string | number;
  companyId: number;
  requestUserId: number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId,
  companyId,
  requestUserId
}: UpdateUserRequest): Promise<Response | undefined> => {
  const user = await ShowUserService(userId, companyId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });
  
  const { name, email, password, profile, queueIds } = userData;

  try {
    await schema.validate({ name, email, password, profile });
  } catch (err: any) {
    throw new AppError(err.message);
  }
  
  // Cria um objeto para armazenar apenas os dados que serão atualizados.
  const dataToUpdate: UserData = {};

  // Preenche o objeto apenas com os campos que foram realmente fornecidos.
  if (userData.email) { dataToUpdate.email = userData.email; }
  if (userData.name) { dataToUpdate.name = userData.name; }
  if (userData.password) { dataToUpdate.password = userData.password; }
  if (userData.profile) { dataToUpdate.profile = userData.profile; }
  if (userData.startWork) { dataToUpdate.startWork = userData.startWork; }
  if (userData.endWork) { dataToUpdate.endWork = userData.endWork; }
  if (userData.farewellMessage) { dataToUpdate.farewellMessage = userData.farewellMessage; }
  if (userData.allTicket) { dataToUpdate.allTicket = userData.allTicket; }
  if (userData.defaultTheme) { dataToUpdate.defaultTheme = userData.defaultTheme; }
  if (userData.defaultMenu) { dataToUpdate.defaultMenu = userData.defaultMenu; }
  if (userData.allowGroup !== undefined) { dataToUpdate.allowGroup = userData.allowGroup; }
  if (userData.allHistoric) { dataToUpdate.allHistoric = userData.allHistoric; }
  if (userData.allUserChat) { dataToUpdate.allUserChat = userData.allUserChat; }
  if (userData.userClosePendingTicket) { dataToUpdate.userClosePendingTicket = userData.userClosePendingTicket; }
  if (userData.showDashboard) { dataToUpdate.showDashboard = userData.showDashboard; }
  if (userData.defaultTicketsManagerWidth) { dataToUpdate.defaultTicketsManagerWidth = userData.defaultTicketsManagerWidth; }
  if (userData.allowRealTime) { dataToUpdate.allowRealTime = userData.allowRealTime; }
  if (userData.profileImage) { dataToUpdate.profileImage = userData.profileImage; }
  if (userData.allowConnections) { dataToUpdate.allowConnections = userData.allowConnections; }
  if (userData.language) { dataToUpdate.language = userData.language; }

  // Coerção booleana explícita
  if (userData.canViewAllContacts !== undefined) {
    dataToUpdate.canViewAllContacts = !!userData.canViewAllContacts;
  }
  
  // Lógica especial para a conexão (whatsappId):
  // Só atualiza se o campo for enviado, permitindo que seja definido como nulo.
  if (userData.whatsappId !== undefined) {
    dataToUpdate.whatsappId = userData.whatsappId === 0 ? null : userData.whatsappId;
  }

  await user.update(dataToUpdate);

  // Lógica especial para as filas:
  // Só atualiza as filas se o campo queueIds for enviado.
  if (queueIds !== undefined) {
    await user.$set("queues", queueIds);
  }

  await user.reload();

  const company = await Company.findByPk(user.companyId);
  const oldUserEmail = user.email;

  if (company?.email === oldUserEmail) {
    await company.update({
      email,
      password
    })
  }
  
  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    companyId: user.companyId,
    company,
    queues: user.queues,
    startWork: user.startWork,
    endWork: user.endWork,
    greetingMessage: user.farewellMessage,
    allTicket: user.allTicket,

    defaultMenu: user.defaultMenu,
    defaultTheme: user.defaultTheme,
    allowGroup: user.allowGroup,
    allHistoric: user.allHistoric,
    userClosePendingTicket: user.userClosePendingTicket,
    showDashboard: user.showDashboard,
    defaultTicketsManagerWidth: user.defaultTicketsManagerWidth,
    allowRealTime: user.allowRealTime,
    allowConnections: user.allowConnections,
    profileImage: user.profileImage,

    // >>> IMPORTANTE: devolver para o front persistir o estado do select
    canViewAllContacts: !!user.canViewAllContacts
  };

  return serializedUser;
};

export default UpdateUserService;
