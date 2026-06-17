import axios from "axios";
import Ticket from "../../models/Ticket";
import QueueIntegrations from "../../models/QueueIntegrations";
import { WASocket, delay, proto } from "baileys";
import { getBodyMessage } from "../WbotServices/wbotMessageListener";
import logger from "../../utils/logger";
import { isNil } from "lodash";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import moment from "moment";
import formatBody from "../../helpers/Mustache";
import ShowTicketService from "../TicketServices/ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import Queue from "../../models/Queue";

type Session = WASocket & {
    id?: number;
};

interface Request {
    wbot: Session;
    msg: proto.IWebMessageInfo;
    ticket: Ticket;
    typebot: QueueIntegrations;
}

const typebotListener = async (request: Request): Promise<void> => {
    let { wbot, msg, ticket, typebot } = request;

    if (msg.key.remoteJid === 'status@broadcast') return;

    if (!ticket.contact) {
        logger.info(`Ticket ${ticket.id} veio sem contato, buscando versão completa.`);
        try {
            ticket = await ShowTicketService(ticket.id, ticket.companyId);
        } catch (err) {
            logger.error(`Erro ao buscar ticket completo para o Typebot: ${err}`);
            return;
        }
    }

    const normalizedJid = ticket.contact.remoteJid;
    if (!normalizedJid) {
        logger.error(`Typebot Listener: Ticket ${ticket.id} não possui um remoteJid de contato válido.`);
        return;
    }

    const { urlN8N: url,
        typebotExpires,
        typebotKeywordFinish,
        typebotKeywordRestart,
        typebotUnknownMessage,
        typebotSlug,
        typebotDelayMessage,
        typebotRestartMessage
    } = typebot;

    const number = normalizedJid.replace(/\D/g, '');
    const body = getBodyMessage(msg) || "";

    if (body.trim() === '#') {
        logger.info(`Usuário ${number} solicitou volta ao menu principal. Encerrando sessão Typebot.`);

        await ticket.update({
            useIntegration: false,
            integrationId: null,
            typebotSessionId: null,
            typebotStatus: false,
            isBot: true,
            queueId: null
        });

        const whatsapp = await ShowWhatsAppService(wbot.id, ticket.companyId);
        const { queues, greetingMessage } = whatsapp;

        let options = "";
        queues.forEach((queue, index) => {
            options += `*[ ${index + 1} ]* - ${queue.name}\n`;
        });
        options += `\n*[ Sair ]* - Encerrar atendimento`;

        const menuMessage = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);
        await wbot.sendMessage(normalizedJid, { text: menuMessage });
        return;
    }

    async function createSession(msg, typebot, number, messageBody) {
        try {
            const reqData = JSON.stringify({
                "isStreamEnabled": true,
                "message": messageBody,
                "resultId": "string",
                "isOnlyRegistering": false,
                "prefilledVariables": {
                    "number": number,
                    "pushName": msg.pushName || ticket.contact.name || "",
                    "remoteJid": normalizedJid
                },
            });

            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${url}/api/v1/typebots/${typebotSlug}/startChat`,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                data: reqData
            };

            const response = await axios.request(config);
            return response.data;

        } catch (err) {
            logger.error("Erro ao criar sessão do typebot: ", err);
            throw err;
        }
    }

    let sessionId;
    let dataStart;
    let status = false;
    try {
        let Agora = new Date();
        Agora.setMinutes(Agora.getMinutes() - Number(typebotExpires));

        if (typebotExpires > 0 && ticket.typebotSessionTime && Agora > ticket.typebotSessionTime) {
            await ticket.update({
                typebotSessionId: null,
                typebotSessionTime: null,
                isBot: true
            });
            await ticket.reload();
        }

        if (isNil(ticket.typebotSessionId)) {
            dataStart = await createSession(msg, typebot, number, body);
            sessionId = dataStart.sessionId;
            status = true;
            await ticket.update({
                typebotSessionId: sessionId,
                typebotStatus: true,
                useIntegration: true,
                integrationId: typebot.id,
                typebotSessionTime: moment().toDate()
            });
            await ticket.reload();
        } else {
            sessionId = ticket.typebotSessionId;
            status = ticket.typebotStatus;
        }

        if (!status) return;

        if (body.toLocaleLowerCase().trim() !== typebotKeywordFinish.toLocaleLowerCase().trim() && body.toLocaleLowerCase().trim() !== typebotKeywordRestart.toLocaleLowerCase().trim()) {
            let messages;
            let input;
            let clientSideActions;

            if (dataStart === undefined) {
                // ---> INÍCIO DA CORREÇÃO: Bloco try/catch mais robusto
                try {
                    const reqData = JSON.stringify({ "message": body });
                    const config = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: `${url}/api/v1/sessions/${sessionId}/continueChat`,
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        data: reqData
                    };
                    const requestContinue = await axios.request(config);
                    messages = requestContinue.data?.messages;
                    input = requestContinue.data?.input;
                    clientSideActions = requestContinue.data?.clientSideActions;
                } catch (apiError) {
                    logger.warn("API do Typebot retornou um erro para /continueChat. Assumindo mensagem desconhecida.", apiError);
                    // Se a API falhar, tratamos como se o bot não tivesse entendido.
                    // Não encerramos a sessão.
                    messages = [];
                }
                // ---> FIM DA CORREÇÃO <---
            } else {
                messages = dataStart?.messages;
                input = dataStart?.input;
                clientSideActions = dataStart?.clientSideActions;
            }

            if (!messages || messages.length === 0) {
                await wbot.sendMessage(normalizedJid, { text: typebotUnknownMessage });
            } else {
                for (const message of messages) {
                    if (message.type === 'text') {
                        let formattedText = '';
                        // ... (código de formatação de texto otimizado)
                        for (const richText of message.content.richText) {
                            for (const element of richText.children) {
                                let text = '';
                                if (element.text) { text = element.text; }
                                if (element.type && element.children) {
                                    for (const subelement of element.children) {
                                        let subtext = '';
                                        if (subelement.text) { subtext = subelement.text; }
                                        if (subelement.type && subelement.children) {
                                            for (const subelement2 of subelement.children) {
                                                let subtext2 = '';
                                                if (subelement2.text) { subtext2 = subelement2.text; }
                                                if (subelement2.bold) { subtext2 = `*${subtext2}*`; }
                                                if (subelement2.italic) { subtext2 = `_${subtext2}_`; }
                                                if (subelement2.underline) { subtext2 = `~${subtext2}~`; }
                                                if (subelement2.url) { const linkText = subelement2.children[0].text; subtext2 = `[${linkText}](${subelement2.url})`;}
                                                subtext += subtext2;
                                            }
                                        }
                                        if (subelement.bold) { subtext = `*${subtext}*`; }
                                        if (subelement.italic) { subtext = `_${subtext}_`; }
                                        if (subelement.underline) { subtext = `~${subtext}~`; }
                                        if (subelement.url) { const linkText = subelement.children[0].text; subtext = `[${linkText}](${subelement.url})`;}
                                        text += subtext;
                                    }
                                }
                                if (element.bold) { text = `*${text}*`; }
                                if (element.italic) { text = `_${text}_`; }
                                if (element.underline) { text = `~${text}~`; }
                                if (element.url) { const linkText = element.children[0].text; text = `[${linkText}](${element.url})`;}
                                formattedText += text;
                            }
                            formattedText += '\n';
                        }
                        formattedText = formattedText.replace('**', '').replace(/\n$/, '');

                        if (formattedText === "Invalid message. Please, try again.") {
                            formattedText = typebotUnknownMessage;
                        }

                        if (formattedText.startsWith("#")) {
                            const gatilho = formattedText.replace("#", "");
                            try {
                                const jsonGatilho = JSON.parse(gatilho);
                                if (jsonGatilho.stopBot) {
                                    await ticket.update({ useIntegration: false, isBot: false });
                                    return;
                                }
                                if (jsonGatilho.queueId) {
                                    await UpdateTicketService({
                                        ticketData: {
                                            queueId: jsonGatilho.queueId,
                                            userId: jsonGatilho.userId || null,
                                            isBot: false,
                                            useIntegration: false,
                                            integrationId: null
                                        },
                                        ticketId: ticket.id,
                                        companyId: ticket.companyId
                                    });
                                    return;
                                }
                            } catch (err) {
                                logger.error("Erro ao processar gatilho do Typebot:", err);
                            }
                        }

                        await wbot.presenceSubscribe(normalizedJid);
                        await wbot.sendPresenceUpdate('composing', normalizedJid);
                        await delay(typebotDelayMessage);
                        await wbot.sendPresenceUpdate('paused', normalizedJid);
                        await wbot.sendMessage(normalizedJid, { text: formatBody(formattedText, ticket) });
                    }

                    if (message.type === 'audio') {
                        await wbot.presenceSubscribe(normalizedJid);
                        await wbot.sendPresenceUpdate('recording', normalizedJid);
                        await delay(typebotDelayMessage);
                        await wbot.sendMessage(normalizedJid, { audio: { url: message.content.url }, mimetype: 'audio/mp4', ptt: true });
                        await wbot.sendPresenceUpdate('paused', normalizedJid);
                    }

                    if (message.type === 'image') {
                        await wbot.presenceSubscribe(normalizedJid);
                        await wbot.sendPresenceUpdate('composing', normalizedJid);
                        await delay(typebotDelayMessage);
                        await wbot.sendMessage(normalizedJid, { image: { url: message.content.url } });
                        await wbot.sendPresenceUpdate('paused', normalizedJid);
                    }

                    if (message.type === 'video') {
                        await wbot.presenceSubscribe(normalizedJid);
                        await wbot.sendPresenceUpdate('composing', normalizedJid);
                        await delay(typebotDelayMessage);
                        await wbot.sendMessage(normalizedJid, { video: { url: message.content.url } });
                        await wbot.sendPresenceUpdate('paused', normalizedJid);
                    }

                    if (clientSideActions) {
                        for (const action of clientSideActions) {
                            if (action?.lastBubbleBlockId === message.id && action.wait) {
                                await delay(action.wait.secondsToWaitFor * 1000);
                            }
                        }
                    }
                }

                if (input && input.type === 'choice input') {
                    let formattedText = '';
                    input.items.forEach(item => {
                        formattedText += `▶️ ${item.content}\n`;
                    });
                    formattedText = formattedText.replace(/\n$/, '');
                    await wbot.presenceSubscribe(normalizedJid);
                    await wbot.sendPresenceUpdate('composing', normalizedJid);
                    await delay(typebotDelayMessage);
                    await wbot.sendPresenceUpdate('paused', normalizedJid);
                    await wbot.sendMessage(normalizedJid, { text: formattedText });
                }
            }
        }

        if (body.toLocaleLowerCase().trim() === typebotKeywordRestart.toLocaleLowerCase().trim()) {
            await ticket.update({ isBot: true, typebotSessionId: null });
            await ticket.reload();
            await wbot.sendMessage(normalizedJid, { text: typebotRestartMessage });
        }

        if (body.toLocaleLowerCase().trim() === typebotKeywordFinish.toLocaleLowerCase().trim()) {
            await UpdateTicketService({
                ticketData: {
                    status: "closed",
                    useIntegration: false,
                    integrationId: null,
                    sendFarewellMessage: true
                },
                ticketId: ticket.id,
                companyId: ticket.companyId
            });
            return;
        }
    } catch (error) {
        logger.error("Error on typebotListener: ", error);
        // Em caso de erro grave, limpamos a sessão para evitar loops.
        await ticket.update({ typebotSessionId: null, typebotStatus: false, useIntegration: false });
        throw error;
    }
}

export default typebotListener;