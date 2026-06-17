import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";
import logger from "../../utils/logger";

const formData: FormData = new FormData();

const apiBase = (token: string) =>
  axios.create({
    baseURL: "https://graph.facebook.com/v18.0/",
    params: {
      access_token: token
    }
  });

export const getAccessToken = async (): Promise<string> => {
  const { data } = await axios.get(
    "https://graph.facebook.com/v18.0/oauth/access_token",
    {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        grant_type: "client_credentials"
      }
    }
  );

  return data.access_token;
};

export const markSeen = async (id: string, token: string): Promise<void> => {
  await apiBase(token).post(`${id}/messages`, {
    recipient: {
      id
    },
    sender_action: "mark_seen"
  });
};

export const showTypingIndicator = async (
  id: string,
  token: string,
  action: string
): Promise<void> => {
  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id
      },
      sender_action: action
    });

    return data;
  } catch (error) {
    console.log(error);
  }
};

export const sendText = async (
  id: string | number,
  text: string,
  token: string
): Promise<void> => {
  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id
      },
      message: {
        text: `${text}`
      }
    });
    return data;
  } catch (error) {
    console.log(error);
  }
};

export const sendAttachmentFromUrl = async (
  id: string,
  url: string,
  type: string,
  token: string
): Promise<void> => {
  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id
      },
      message: {
        attachment: {
          type,
          payload: {
            url
          }
        }
      }
    });

    return data;
  } catch (error) {
    console.log(error);
  }
};

export const sendAttachment = async (
  id: string,
  file: Express.Multer.File,
  type: string,
  token: string
): Promise<void> => {
  formData.append(
    "recipient",
    JSON.stringify({
      id
    })
  );

  formData.append(
    "message",
    JSON.stringify({
      attachment: {
        type,
        payload: {
          is_reusable: true
        }
      }
    })
  );

  const fileReaderStream = createReadStream(file.path);

  formData.append("filedata", fileReaderStream);

  try {
    await apiBase(token).post("me/messages", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
  } catch (error: any) {
    throw new Error(error);
  }
};

export const genText = (text: string): any => {
  const response = {
    text
  };

  return response;
};

export const getProfile = async (id: string, token: string): Promise<any> => {
  try {
    // Tenta buscar alguns campos básicos do perfil do usuário do Messenger
    const { data } = await apiBase(token).get(`${id}`, {
      params: {
        // Campos mais comuns permitidos para Messenger
        fields: "first_name,last_name,name,profile_pic"
      }
    });

    return data;
  } catch (error: any) {
    console.error("[getProfile] Erro ao buscar perfil do usuário:", 
      error?.response?.data || error);

    // ⚠️ IMPORTANTE:
    // Não vamos mais estourar erro aqui, para não matar o handleMessage.
    // Se o Graph não deixar ler o perfil (permissão/fb bug), seguimos só com o ID.
    return { id };
  }
};


/**
 * Busca as páginas do usuário logado.
 * 1) Tenta /me/accounts
 * 2) Se vier vazio, tenta businesses -> owned_pages
 * Sempre retorna { data: Page[] } para o storeFacebook.
 */
export const getPageProfile = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    logger.info("[getPageProfile] Tentando via /me/accounts", {
      passedId: id
    });

    const first = await apiBase(token).get(
      "me/accounts?fields=name,access_token,instagram_business_account{id,username,profile_picture_url,name}"
    );

    const pagesFromAccounts = first.data?.data || [];
    logger.info("[getPageProfile] /me/accounts retornou", {
      count: pagesFromAccounts.length
    });

    if (pagesFromAccounts.length > 0) {
      // mantém formato esperado: { data: [...] }
      return { data: pagesFromAccounts };
    }

    logger.warn(
      "[getPageProfile] /me/accounts vazio, tentando via businesses/owned_pages"
    );

    const second = await apiBase(token).get(
      "me?fields=businesses{owned_pages{name,id,access_token,instagram_business_account{id,username,profile_picture_url,name}}}"
    );

    const businesses = second.data?.businesses?.data || [];
    const pagesFromBusinesses: any[] = [];

    for (const b of businesses) {
      const owned = b?.owned_pages?.data || [];
      pagesFromBusinesses.push(...owned);
    }

    logger.info("[getPageProfile] businesses.owned_pages retornou", {
      count: pagesFromBusinesses.length
    });

    return { data: pagesFromBusinesses };
  } catch (error: any) {
    logger.error("[getPageProfile] ERRO ao buscar páginas", {
      error: error?.response?.data || error?.message || error
    });
    throw new Error("ERR_FETCHING_FB_PAGES");
  }
};

export const profilePsid = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v18.0/${id}?access_token=${token}`
    );
    return data;
  } catch (error) {
    console.log(error);
    await getProfile(id, token);
  }
};

export const subscribeApp = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.post(
      `https://graph.facebook.com/v18.0/${id}/subscribed_apps?access_token=${token}`,
      {
        subscribed_fields: [
          "messages",
          "messaging_postbacks",
          "message_deliveries",
          "message_reads",
          "message_echoes"
        ]
      }
    );
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_SUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const unsubscribeApp = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await axios.delete(
      `https://graph.facebook.com/v18.0/${id}/subscribed_apps?access_token=${token}`
    );
    return data;
  } catch (error) {
    throw new Error("ERR_UNSUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const getSubscribedApps = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(`${id}/subscribed_apps`);
    return data;
  } catch (error) {
    throw new Error("ERR_GETTING_SUBSCRIBED_APPS");
  }
};

export const getAccessTokenFromPage = async (
  token: string
): Promise<string> => {
  try {
    if (!token) throw new Error("ERR_FETCHING_FB_USER_TOKEN");

    const data = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          grant_type: "fb_exchange_token",
          fb_exchange_token: token
        }
      }
    );

    return data.data.access_token;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_TOKEN");
  }
};

export const removeApplcation = async (
  id: string,
  token: string
): Promise<void> => {
  try {
    await axios.delete(`https://graph.facebook.com/v18.0/${id}/permissions`, {
      params: {
        access_token: token
      }
    });
  } catch (error) {
    logger.error("ERR_REMOVING_APP_FROM_PAGE");
  }
};
