import moment from "moment";
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import { isNil } from "lodash";
import sendFaceMessage from "../FacebookServices/sendFacebookMessage";
import { verifyMessageFace } from "../FacebookServices/facebookMessageListener";
import ShowUserService from "../UserServices/ShowUserService";
import User from "../../models/User";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateLogTicketService from "./CreateLogTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "./FindOrCreateTicketService";
import formatBody from "../../helpers/Mustache";
import AppError from "../../errors/AppError";
import Message from "../../models/Message"; // <<— para migrar histórico

// ===== helpers =====

const safeFormatBody = (tpl: string, ticket: any) => {
  try {
    return formatBody(tpl, ticket);
  } catch (e) {
    Sentry.captureException(e);
    return tpl.replace(/\{\{[^}]*$/g, "");
  }
};

const applySimpleVars = (
  tpl: string,
  opts: { contactName?: string; userName?: string; queueName?: string }
) => {
  const contactName = opts.contactName ?? "";
  const userName = opts.userName ?? "";
  const queueName = opts.queueName ?? "";

  return tpl
    .replace(/\$\{queue\.name\}/g, queueName)
    .replace(/\{\{\{\s*queue\s*\}\}\}|\{\{\s*queue\s*\}\}/g, queueName)
    .replace(/\{\{\s*name\s*\}\}/g, contactName)
    .replace(/\{\{\s*userName\s*\}\}/g, userName);
};

// Normalizador seguro para números
const toNumOrNull = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ===== tipos =====

interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number | null;
  isBot?: boolean;
  queueOptionId?: number;
  sendFarewellMessage?: boolean;
  amountUsedBotQueues?: number;
  lastMessage?: string;
  integrationId?: number;
  useIntegration?: boolean;
  unreadMessages?: number;
  msgTransfer?: string;
  isTransfered?: boolean;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId: number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

// ===== serviço =====

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId
}: Request): Promise<Response> => {
  try {
    // --- HOTFIX (idempotente): se vier queueId = 0 do fluxo, trate como "não informado"
    if (ticketData && (ticketData as any).queueId === 0) {
      delete (ticketData as any).queueId;
    }

    let {
      queueId,
      userId,
      sendFarewellMessage = true,
      amountUsedBotQueues,
      lastMessage,
      integrationId,
      useIntegration,
      unreadMessages,
      msgTransfer,
      isTransfered = false,
      status
    } = ticketData;

    // 🔁 REGRA ESPECIAL:
    // Se for transferência (isTransfered) SEM atendente definido (userId null/undefined),
    // garantimos que o status fique como "pending" (AGUARDANDO).
    // Isso cobre inclusive chamadas onde alguém ainda mande "open" por engano.
    if (isTransfered && (userId === null || userId === undefined)) {
      if (!status || status === "open") {
        status = "pending";
      }
    }

    // ADD: Detectar se os campos vieram no payload
    const hasQueueIdField = Object.prototype.hasOwnProperty.call(ticketData, "queueId");
    const hasUserIdField = Object.prototype.hasOwnProperty.call(ticketData, "userId");

    // SUBSTITUÍDO: Normalização condicional apenas se o campo veio no payload
    if (hasUserIdField) {
      userId = userId == null ? null : toNumOrNull(userId);
    }
    if (hasQueueIdField) {
      queueId = queueId == null ? null : toNumOrNull(queueId);
      if (queueId === 0) queueId = null;
    }

    let isBot: boolean | null = ticketData.isBot || false;
    let queueOptionId: number | null = ticketData.queueOptionId || null;

    const io = getIO();

    const settings = await CompaniesSettings.findOne({ where: { companyId } });

    const cfg = {
      userRating: "disabled",
      sendFarewellWaitingTicket: "disabled",
      transferMessage: "",
      closeTicketOnTransfer: false,
      sendMsgTransfTicket: "disabled",
      ...(settings?.toJSON?.() ?? {})
    } as any;

    let ticket = await ShowTicketService(ticketId, companyId);

    if (ticket.channel === "whatsapp" && ticket.whatsappId) {
      SetTicketMessagesAsRead(ticket);
    }

    const oldStatus = ticket?.status;
    const oldUserId = ticket.user?.id;
    const oldQueueId = ticket?.queueId;

    if (isNil(ticket.whatsappId) && status === "closed") {
      await CreateLogTicketService({
        userId,
        queueId: ticket.queueId,
        ticketId,
        type: "closed"
      });

      await ticket.update({ status: "closed" });

      io.of(String(companyId)).emit(`company-${ticket.companyId}-ticket`, {
        action: "delete",
        ticketId: ticket.id
      });

      return { ticket, oldStatus, oldUserId };
    }

    if (oldStatus === "closed") {
      let otherTicket = await Ticket.findOne({
        where: {
          contactId: ticket.contactId,
          status: { [Op.or]: ["open", "pending", "group"] },
          whatsappId: ticket.whatsappId
        }
      });
      if (otherTicket && otherTicket.id !== ticket.id) {
        otherTicket = await ShowTicketService(otherTicket.id, companyId);
        return { ticket: otherTicket, oldStatus, oldUserId };
      }
      // 🔁 ANTES: sempre matava o bot aqui.
      // AGORA: só desliga se o chamador não especificou isBot no payload.
      if (typeof ticketData.isBot === "undefined") {
        isBot = false;
      }
    }

    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId,
      companyId,
      whatsappId: ticket?.whatsappId
    });

    const { complationMessage, ratingMessage, groupAsTicket } =
      await ShowWhatsAppService(ticket?.whatsappId, companyId);

    // ===== fechamento =====
    if (status !== undefined && ["closed"].includes(status)) {
      const _userId = ticket.userId || userId;
      let user: User | null = null;
      if (_userId) user = await User.findByPk(_userId);

      const canAskNps =
        cfg.userRating === "enabled" &&
        (sendFarewellMessage || sendFarewellMessage === undefined) &&
        (!!ratingMessage && ratingMessage !== "") &&
        !ticket.isGroup;

      if (canAskNps && ticketTraking.ratingAt == null) {
        const ratingTxt = ratingMessage || "";
        const bodyRatingMessage = `\u200e ${ratingTxt}\n`;

        if (ticket.channel === "whatsapp" && ticket.whatsapp?.status === "CONNECTED") {
          const msg = await SendWhatsAppMessage({
            body: bodyRatingMessage,
            ticket,
            isForwarded: false
          });
          await verifyMessage(msg, ticket, ticket.contact);
        } else if (["facebook", "instagram"].includes(ticket.channel)) {
          const msg = await sendFaceMessage({ body: bodyRatingMessage, ticket });
          await verifyMessageFace(msg, bodyRatingMessage, ticket, ticket.contact);
        }

        await ticketTraking.update({
          userId: ticket.userId,
          closedAt: moment().toDate()
        });

        await CreateLogTicketService({
          userId: ticket.userId,
          queueId: ticket.queueId,
          ticketId,
          type: "nps"
        });

        // Mantém lid/jid durante o NPS
        await ticket.update({
          status: "nps",
          amountUsedBotQueuesNPS: 1
        });

        io.of(String(companyId)).emit(`company-${ticket.companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });

        return { ticket, oldStatus, oldUserId };
      }

      if (
        (((user && user.farewellMessage) || complationMessage) &&
          (sendFarewellMessage || sendFarewellMessage === undefined))
      ) {
        let body: string | undefined;

        const canSendFarewell =
          ticket.status !== "pending" ||
          (ticket.status === "pending" && cfg.sendFarewellWaitingTicket === "enabled");

        if (canSendFarewell) {
          if (user?.farewellMessage) body = `\u200e ${user.farewellMessage}`;
          else if (complationMessage) body = `\u200e ${complationMessage}`;

          if (body) {
            if (
              ticket.channel === "whatsapp" &&
              (!ticket.isGroup || groupAsTicket === "enabled") &&
              ticket.whatsapp?.status === "CONNECTED"
            ) {
              const sent = await SendWhatsAppMessage({
                body,
                ticket,
                isForwarded: false
              });
              await verifyMessage(sent, ticket, ticket.contact);
            }

            if (
              ["facebook", "instagram"].includes(ticket.channel) &&
              (!ticket.isGroup || groupAsTicket === "enabled")
            ) {
              await sendFaceMessage({ body, ticket });
            }
          }
        }
      }

      ticketTraking.finishedAt = moment().toDate();
      ticketTraking.closedAt = moment().toDate();
      ticketTraking.whatsappId = ticket?.whatsappId;
      ticketTraking.userId = ticket.userId;

      await CreateLogTicketService({
        userId: ticket.userId,
        queueId: ticket.queueId,
        ticketId,
        type: "closed"
      });

      await ticketTraking.save();

            await ticket.update({
        status: "closed",
        lastFlowId: null,
        dataWebhook: null,
        hashFlowId: null,
        lid: null,
        jid: null,
        // 🔴 IMPORTANTE: resetar flag de transferência
        isTransfered: false as any
      });


      io.of(String(companyId)).emit(`company-${ticket.companyId}-ticket`, {
        action: "delete",
        ticketId: ticket.id
      });

      return { ticket, oldStatus, oldUserId };
    }

    // ===== transferência =====
    let queue: Queue | null = null;

    // SUBSTITUÍDO: Só busca fila se o campo queueId veio no payload e é válido
    if (hasQueueIdField && !isNil(queueId)) {
      queue = await Queue.findByPk(queueId);
      if (!queue) {
        // evita erro genérico no topo: devolve erro específico
        throw new AppError("ERR_UPDATE_TICKET_QUEUE_NOT_FOUND", 400);
      }
      ticketTraking.queuedAt = moment().toDate();
    }

    if (isTransfered) {
      if (cfg.closeTicketOnTransfer) {
        let newTicketTransfer = ticket;

        if (oldQueueId !== queueId) {
          await ticket.update({ status: "closed", lid: null, jid: null });
          await ticket.reload();

          io.of(String(companyId)).emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticketId: ticket.id
          });

          try {
            newTicketTransfer = await FindOrCreateTicketService(
              ticket.contact,
              ticket.whatsapp,
              1,
              ticket.companyId,
              queueId,
              userId,
              null,
              ticket.channel,
              false,
              false,
              settings,
              true
            );

            await FindOrCreateATicketTrakingService({
              ticketId: newTicketTransfer.id,
              companyId,
              whatsappId: ticket.whatsapp?.id ?? ticket.whatsappId,
              userId
            });

            // >>> MIGRA O HISTÓRICO DO TICKET ANTIGO PARA O NOVO <<<
            if (newTicketTransfer.id !== ticket.id) {
              await Message.update(
                { ticketId: newTicketTransfer.id },
                { where: { ticketId: ticket.id } }
              );
            }
          } catch (e: any) {
            const isUnique =
              e?.name === "SequelizeUniqueConstraintError" ||
              e?.original?.code === "23505";
            if (!isUnique) throw e;

            // fallback: reutiliza o mesmo ticket (histórico já está nele)
            await ticket.update({
              queueId,
              userId,
              status:
                status ??
                (isTransfered && (userId === null || userId === undefined)
                  ? "pending"
                  : "open")
            });
            await ticket.reload();
            newTicketTransfer = ticket;

            await ticketTraking.update({
              userId: ticket.userId,
              queueId: ticket.queueId,
              finishedAt: null,
              closedAt: null,
              startedAt: moment().toDate()
            });
          }
        }

        if (!isNil(msgTransfer)) {
          const messageData = {
            wid: `PVT${newTicketTransfer.updatedAt.toString().replace(" ", "")}`,
            ticketId: newTicketTransfer.id,
            contactId: undefined,
            body: msgTransfer,
            fromMe: true,
            mediaType: "extendedTextMessage" as const,
            read: true,
            quotedMsgId: null as any,
            remoteJid: newTicketTransfer.contact?.remoteJid as any,
            participant: null as any,
            dataJson: null as any,
            ticketTrakingId: null as any,
            isPrivate: true
          };
          await CreateMessageService({
            messageData,
            companyId: ticket.companyId
          });
        }

        await newTicketTransfer.update({ queueId, userId, status });
        await newTicketTransfer.reload();

        if (cfg.sendMsgTransfTicket === "enabled") {
          if (
            (oldQueueId !== queueId || oldUserId !== userId) &&
            !isNil(oldQueueId) &&
            !isNil(queueId) &&
            ticket.whatsapp?.status === "CONNECTED"
          ) {
            const wbot = await GetTicketWbot(ticket);

            const agentName =
              ticket.user?.name ??
              (userId ? (await ShowUserService(userId, companyId))?.name : "") ??
              "";
            const contactName =
              ticket.contact?.name ?? ticket.contact?.number ?? "";
            const queueName = queue?.name ?? "";

            const baseMsg = cfg.transferMessage ?? "";
            const substitutedSimple = applySimpleVars(baseMsg, {
              userName: agentName,
              contactName,
              queueName
            });
            const msgtxt = safeFormatBody(`\u200e ${substitutedSimple}`, ticket);

            const queueChangedMessage = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              { text: msgtxt }
            );
            await verifyMessage(
              queueChangedMessage,
              ticket,
              ticket.contact,
              ticketTraking
            );
          }
        }

        if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          await CreateLogTicketService({
            userId,
            queueId: oldQueueId,
            ticketId: newTicketTransfer.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId !== queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          await CreateLogTicketService({
            userId,
            queueId,
            ticketId: newTicketTransfer.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== undefined &&
          isNil(userId) &&
          oldQueueId !== queueId &&
          !isNil(queueId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        }

        if (
          newTicketTransfer.status !== oldStatus ||
          newTicketTransfer.user?.id !== oldUserId
        ) {
          await ticketTraking.update({ userId: newTicketTransfer.userId });
          io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
            action: "delete",
            ticketId: newTicketTransfer.id
          });
        }

        io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket: newTicketTransfer
        });

        return { ticket: newTicketTransfer, oldStatus, oldUserId };
      } else {
        // transferência sem fechar ticket
        if (cfg.sendMsgTransfTicket === "enabled") {
          if (
            (oldQueueId !== queueId || oldUserId !== userId) &&
            !isNil(oldQueueId) &&
            !isNil(queueId) &&
            ticket.whatsapp?.status === "CONNECTED"
          ) {
            const wbot = await GetTicketWbot(ticket);

            const agentName =
              ticket.user?.name ??
              (userId ? (await ShowUserService(userId, companyId))?.name : "") ??
              "";
            const contactName =
              ticket.contact?.name ?? ticket.contact?.number ?? "";
            const queueName = queue?.name ?? "";

            const baseMsg = cfg.transferMessage ?? "";
            const substitutedSimple = applySimpleVars(baseMsg, {
              userName: agentName,
              contactName,
              queueName
            });
            const msgtxt = safeFormatBody(`\u200e ${substitutedSimple}`, ticket);

            const queueChangedMessage = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              { text: msgtxt }
            );
            await verifyMessage(
              queueChangedMessage,
              ticket,
              ticket.contact,
              ticketTraking
            );
          }
        }

        if (!isNil(msgTransfer)) {
          const messageData = {
            wid: `PVT${ticket.updatedAt.toString().replace(" ", "")}`,
            ticketId: ticket.id,
            contactId: undefined,
            body: msgTransfer,
            fromMe: true,
            mediaType: "extendedTextMessage" as const,
            read: true,
            quotedMsgId: null as any,
            ack: 2,
            remoteJid: ticket.contact?.remoteJid as any,
            participant: null as any,
            dataJson: null as any,
            ticketTrakingId: null as any,
            isPrivate: true
          };
          await CreateMessageService({
            messageData,
            companyId: ticket.companyId
          });
        }

        if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          await CreateLogTicketService({
            userId,
            queueId: oldQueueId,
            ticketId: ticket.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId !== queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          await CreateLogTicketService({
            userId,
            queueId,
            ticketId: ticket.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== undefined &&
          isNil(userId) &&
          oldQueueId !== queueId &&
          !isNil(queueId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        }
      }
    }

    // fila que fecha ticket automaticamente
    status = queue && queue.closeTicket ? "closed" : status;

    // SUBSTITUÍDO: Monta objeto de update dinamicamente
        const updateData: any = {
      status,
      isBot,
      queueOptionId,
      amountUsedBotQueues:
        status === "closed"
          ? 0
          : amountUsedBotQueues ?? ticket.amountUsedBotQueues,
      lastMessage: lastMessage ?? ticket.lastMessage,
      useIntegration,
      integrationId,
      typebotSessionId: !useIntegration ? null : ticket.typebotSessionId,
      typebotStatus: useIntegration,
      unreadMessages,
      // 🔴 garante que o valor passado no ticketData seja refletido no model
      isTransfered
    };


    // CORREÇÃO: Só inclui userId no update se o campo veio no payload
    if (hasUserIdField) updateData.userId = userId;
    if (hasQueueIdField) updateData.queueId = queueId;

    await ticket.update(updateData);

    // SUBSTITUÍDO: Só atualiza ticketTraking.queueId se o campo veio no payload
    if (hasQueueIdField) {
      ticketTraking.queuedAt = moment().toDate();
      ticketTraking.queueId = queueId ?? null;
    }

    await ticket.reload();

    if (status !== undefined && ["pending"].includes(status)) {
      await CreateLogTicketService({
        userId: oldUserId,
        ticketId,
        type: "pending"
      });

      await ticketTraking.update({
        whatsappId: ticket.whatsappId,
        startedAt: null,
        userId: null
      });
    }

    if (status !== undefined && ["open"].includes(status)) {
      await ticketTraking.update({
        startedAt: moment().toDate(),
        ratingAt: null,
        rated: false,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId,
        queueId: ticket.queueId
      });

      await CreateLogTicketService({
        userId: userId ?? undefined,
        queueId: ticket.queueId,
        ticketId,
        type: oldStatus === "pending" ? "open" : "reopen"
      });
    }

    await ticketTraking.save();

    if (
      ticket.status !== oldStatus ||
      ticket.user?.id !== oldUserId ||
      ticket.queueId !== oldQueueId
    ) {
      io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticketId: ticket.id
      });
    }

    io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });

    return { ticket, oldStatus, oldUserId };
  } catch (err: any) {
    console.log(
      "erro ao atualizar o ticket",
      ticketId,
      "ticketData",
      ticketData,
      "err:",
      err?.message
    );
    Sentry.captureException(err);
    // mantém a mesma semântica de erro
    throw new AppError("ERR_UPDATE_TICKET", 404);
  }
};

export default UpdateTicketService;
