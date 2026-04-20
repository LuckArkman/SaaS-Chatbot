"""
Gateway de Webhooks — Ponto de entrada para eventos do Baileys/WhatsApp.

Fluxo de entrega de mensagens (ON_MESSAGE):
  1. Baileys → POST /webhook/whatsapp
  2. Gateway normaliza o payload e extrai os campos
  3. ✅ Entrega IMEDIATA ao Frontend via WebSocket RPC (broadcast_to_tenant)
     → Zero banco de dados, zero fila, zero RabbitMQ neste passo
  4. 🗄️  Background Task (asyncio.create_task) para persistir no banco
     → Postgres (Conversation) + MongoDB (MessageDocument)
     → Execução do FluxoBot/IA (se aplicável)

RabbitMQ é utilizado APENAS para:
  - Eventos de ACK de entrega (messages.update) — atualização silenciosa de status
  - Mensagens de saída (agente → cliente) — gerenciamento pelo OutgoingWorker
  NÃO é utilizado para: recepção de mensagens inbound do contato.
"""

from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from src.schemas.whatsapp import WhatsAppPayload, WhatsAppMessageEvent
from src.services.message_normalizer import MessageNormalizer
from src.core.bus import rabbitmq_bus
from src.core.tenancy import get_current_tenant_id, set_current_tenant_id
from src.core.database import SessionLocal
from src.core.ws import ws_manager
from src.services.chat_service import chat_service
from src.models.chat import MessageSide
from loguru import logger
import json
import asyncio

router = APIRouter()

# ─── Autenticação simples do Webhook ────────────────────────────────────────
GATEWAY_API_KEY = "SaaS_Secret_Gateway_Key_2026"

# ─── Mapeamento de aliases de evento → enum canônico ────────────────────────
_EVENT_ALIAS_MAP = {
    "messages.upsert":   WhatsAppMessageEvent.ON_MESSAGE,
    "message.upsert":    WhatsAppMessageEvent.ON_MESSAGE,
    "on_message":        WhatsAppMessageEvent.ON_MESSAGE,
    "messages.update":   WhatsAppMessageEvent.ON_ACK,
    "message.update":    WhatsAppMessageEvent.ON_ACK,
    "on_ack":            WhatsAppMessageEvent.ON_ACK,
    "connection.update": WhatsAppMessageEvent.ON_STATE_CHANGE,
    "on_state_change":   WhatsAppMessageEvent.ON_STATE_CHANGE,
    "on_incoming_call":  WhatsAppMessageEvent.ON_INCOMING_CALL,
}


def verify_gateway_key(x_api_key: str = Header(...)):
    if x_api_key != GATEWAY_API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Gateway API Key")
    return x_api_key


def normalize_webhook_payload(raw: dict) -> dict:
    """Normaliza o payload recebido para o formato canônico interno."""
    event_raw = raw.get("event", "")
    event_enum = _EVENT_ALIAS_MAP.get(str(event_raw).lower())

    if not event_enum:
        for alias, mapped in _EVENT_ALIAS_MAP.items():
            if alias in str(event_raw).lower():
                event_enum = mapped
                break

    if not event_enum:
        logger.warning(f"[Gateway] Evento desconhecido '{event_raw}' — fallback para on_message.")
        event_enum = WhatsAppMessageEvent.ON_MESSAGE

    msg_payload = raw.get("payload") or raw.get("data") or {}
    session = raw.get("session", "")
    if not session:
        body_tenant = raw.get("tenant_id", "")
        session = f"tenant_{body_tenant}" if body_tenant else "unknown_session"

    logger.debug(
        f"[Gateway] Payload normalizado | evento='{event_raw}'→'{event_enum.value}' "
        f"| session='{session}' | payload_keys={list(msg_payload.keys())}"
    )
    return {"event": event_enum.value, "session": session, "payload": msg_payload}


# ─────────────────────────────────────────────────────────────────────────────
# BACKGROUND TASK: Persistência no Banco + Execução do Bot/IA
# Chamada APÓS a entrega ao Frontend. Nunca bloqueia o WebSocket.
# ─────────────────────────────────────────────────────────────────────────────
async def _persist_and_run_bot(
    tenant_id: str,
    contact_phone: str,
    notify_name: str,
    user_input: str,
    external_id: str,
    computed_side: MessageSide,
):
    """
    Executado como asyncio.create_task — completamente desacoplado da entrega ao Frontend.
    Responsabilidades:
      1. Resolver a session_name via Postgres (WhatsAppInstance — dado infra, não histórico)
      2. Fazer upsert do contato no Postgres (contatos são domínio do Postgres)
      3. Persistir a mensagem NO MONGODB exclusivamente (histórico é domínio do MongoDB)
      4. Acionar o FluxoBot/IA (se o atendimento não for humano)
    """
    from src.models.whatsapp import WhatsAppInstance
    from src.services.contact_service import ContactService
    from src.services.message_history_service import MessageHistoryService

    # ── 1a. Resolve session_name + upsert contato via Postgres (infra / cadastro) ──────────
    actual_session = f"tenant_{tenant_id}"  # fallback seguro
    try:
        with SessionLocal() as db:
            instance = (
                db.query(WhatsAppInstance)
                .filter(WhatsAppInstance.tenant_id == tenant_id, WhatsAppInstance.is_active == True)
                .order_by(WhatsAppInstance.id.desc())
                .execution_options(ignore_tenant=True)
                .first()
            )
            if instance:
                actual_session = instance.session_name

            # Upsert de contato — domínio legítimo do Postgres
            ContactService.get_or_create_contact(db, tenant_id, contact_phone, name=notify_name)
    except Exception as pg_err:
        logger.warning(f"[BG] ⚠️ Postgres infra indisponível (session/contato): {pg_err} — prosseguindo com MongoDB")

    # ── 1b. Persistência da mensagem — EXCLUSIVAMENTE no MongoDB ─────────────────────
    for attempt in range(3):
        try:
            await MessageHistoryService.record_message(
                contact_phone=contact_phone,
                content=user_input,
                side=computed_side,
                external_id=external_id,
                session_name=actual_session,
            )
            logger.debug(f"[BG] ✅ Persistência MongoDB concluída para {contact_phone} (tentativa {attempt + 1})")
            break

        except Exception as mongo_err:
            if attempt < 2:
                logger.warning(f"[BG] ⚠️ Retry {attempt + 1}/3 ao persistir MongoDB para {contact_phone}: {mongo_err}")
                await asyncio.sleep(0.15 * (attempt + 1))
            else:
                logger.error(f"[BG] ❌ Falha definitiva ao persistir MongoDB para {contact_phone}: {mongo_err}")

    # ── 2. FluxoBot / IA ──────────────────────────────────────────────────────
    try:
        from src.models.mongo.flow import FlowDocument
        from src.services.session_service import SessionService
        from src.services.flow_executor import FlowExecutor

        flow = await FlowDocument.find_one(
            FlowDocument.tenant_id == tenant_id,
            FlowDocument.is_active == True,
        )
        if not flow:
            return

        session = await SessionService.get_or_create_session(
            tenant_id=tenant_id,
            contact_phone=contact_phone,
            flow_id=str(flow.id),
        )

        if session.is_human_support:
            logger.debug(f"[BG] 👥 Handover ativo para {contact_phone}. Bot ignorado.")
            return

        executor = FlowExecutor(flow)
        await executor.run_step(session, user_input=user_input)

    except Exception as bot_err:
        logger.error(f"[BG] ❌ Erro no FluxoBot para {contact_phone}: {bot_err}")


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT PRINCIPAL DE WEBHOOK
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/webhook/{channel_type}", status_code=status.HTTP_202_ACCEPTED)
async def incoming_webhook(
    channel_type: str,
    request: Request,
    api_key: str = Depends(verify_gateway_key),
) -> Any:
    """
    Endpoint de Webhook para WhatsApp (Baileys) e outros canais.
    Fluxo ON_MESSAGE: Frontend recebe PRIMEIRO, banco persiste DEPOIS em background.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # ── Resolução de Tenant ID ────────────────────────────────────────────────
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        tenant_id = payload.get("tenant_id", "")
        if not tenant_id:
            session_str = str(payload.get("session", ""))
            if session_str.startswith("tenant_"):
                # session_name é do formato "tenant_{TENANT_ID}_{SESSION_SUFFIX}"
                # Ex: "tenant_0C37EFCB_00a5fe70" → split → ["tenant", "0C37EFCB", "00a5fe70"]
                # parts[1] extrai o tenant_id base sem o sufixo de sessão.
                parts = session_str.split("_")
                tenant_id = parts[1] if len(parts) >= 2 else ""
        if tenant_id:
            set_current_tenant_id(tenant_id)
            logger.info(f"[Gateway] tenant_id resolvido: '{tenant_id}'")
        else:
            logger.warning("[Gateway] tenant_id ausente — evento processado com contexto potencialmente falho.")


    logger.info(
        f"[Gateway] ▶ Webhook recebido | channel='{channel_type}' "
        f"| tenant='{tenant_id}' | event='{payload.get('event')}'"
    )

    if channel_type != "whatsapp":
        logger.warning(f"[Gateway] Canal '{channel_type}' não implementado. Descartado.")
        return {"success": True, "status": "ignored"}

    # ── Parse e roteamento por tipo de evento ─────────────────────────────────
    try:
        normalized = normalize_webhook_payload(payload)
        ws_payload = WhatsAppPayload(**normalized)
    except Exception as parse_err:
        logger.error(f"[Gateway] ❌ Falha ao parsear payload: {parse_err}")
        raise HTTPException(status_code=400, detail=f"Webhook parsing error: {str(parse_err)}")

    logger.debug(f"[Gateway] ✅ Evento={ws_payload.event} | session='{ws_payload.session}'")

    # ═══════════════════════════════════════════════════════════════════════════
    # CASO 1: MENSAGEM RECEBIDA (ON_MESSAGE)
    # Fluxo: Frontend PRIMEIRO → Banco em Background
    # ═══════════════════════════════════════════════════════════════════════════
    if ws_payload.event == WhatsAppMessageEvent.ON_MESSAGE:
        msg_body = ws_payload.payload

        # Filtro: ignorar grupos, newsletters e broadcasts
        from_id = msg_body.get("from", "")
        is_group = bool(msg_body.get("isGroupMsg", False))
        if is_group or ("@" in from_id and from_id.split("@")[1] not in ["s.whatsapp.net", "c.us"]):
            logger.debug(f"[Gateway] 🔇 Mensagem de grupo/sistema ignorada: {from_id}")
            return {"success": True, "status": "ignored"}

        # Normalizar mensagem
        try:
            unified_msg = MessageNormalizer.from_whatsapp(tenant_id, msg_body)
        except Exception as norm_err:
            logger.error(f"[Gateway] ❌ Falha na normalização da mensagem: {norm_err}")
            return {"success": False, "status": "normalization_error"}

        is_from_me    = msg_body.get("fromMe", False)
        user_input    = unified_msg.content
        external_id   = unified_msg.message_id
        computed_side = MessageSide.AGENT if is_from_me else MessageSide.CLIENT
        notify_name   = msg_body.get("pushName") or msg_body.get("notifyName") or "Contato S/ Nome"
        contact_phone = unified_msg.from_id.split("@")[0] if "@" in unified_msg.from_id else unified_msg.from_id

        logger.info(f"[Gateway] 📨 Mensagem recebida | from='{contact_phone}' | fromMe={is_from_me} | id='{external_id}'")

        # Para fromMe=True, o "from" é o próprio número do bot — o contato real está em "to"
        # Para fromMe=False, o "from" é o contato (comportamento padrão)
        to_id        = msg_body.get("to", "")
        conv_jid     = to_id if is_from_me else from_id  # JID correto para identificar a conversa
        conv_phone   = conv_jid.split("@")[0] if "@" in conv_jid else conv_jid

        # ── PASSO 1: ENTREGA AO FRONTEND (SEM POSTGRES, 100% MongoDB Architect) ──
        socket_payload = {
            "method": "receive_message",
            "params": {
                "message_id":      external_id,
                "conversation_id": conv_jid,    # JID do CONTATO — sempre, independente de fromMe
                "contact_phone":   conv_phone,
                "contact": {
                    "id":           conv_phone,
                    "full_name":    notify_name,
                    "phone_number": conv_phone,
                },
                "content":   user_input,
                "from_me":   is_from_me,
                "side":      "bot" if is_from_me else "client",
                "type":      unified_msg.type.value if hasattr(unified_msg.type, "value") else "text",
                "caption":   unified_msg.caption,
                "timestamp": msg_body.get("timestamp"),
                "metadata":  unified_msg.metadata,
            },
        }


        # broadcast_to_tenant retorna int: número de conexões que receberam a mensagem.
        # O resultado é usado apenas para observabilidade — NÃO condiciona a persistência.
        ws_delivered = 0
        try:
            ws_delivered = await ws_manager.broadcast_to_tenant(tenant_id, socket_payload)
        except Exception as ws_err:
            logger.error(f"[Gateway] ❌ Exceção ao notificar Frontend via WS: {ws_err}")

        if ws_delivered > 0:
            logger.info(
                f"[Gateway] 🟢 Frontend notificado | {conv_phone} | conexões={ws_delivered}"
            )
        else:
            # Nenhum agente conectado no momento — mas a mensagem AINDA SERÁ persistida.
            # A persistência via asyncio.create_task é o único mecanismo durável pós-entrega.
            # Bloquear a persistência aqui causaria perda permanente de mensagens.
            logger.warning(
                f"[Gateway] ⚠️ Nenhum agente conectado para tenant='{tenant_id}' "
                f"| Mensagem de '{conv_phone}' será persistida mesmo sem entrega ao frontend."
            )

        # 🔕 Mensagens enviadas pelo próprio bot (fromMe=True) não devem alimentar o FluxoBot
        # Isso evita que a resposta do bot dispare outra execução do FluxoBot, corrompendo o estado da sessão.
        if is_from_me:
            logger.debug(f"[Gateway] 🤖 Mensagem própria (fromMe=True) — broadcast feito, sem acionar FluxoBot.")
            return {"success": True, "status": "delivered_from_me"}

        # ── PASSO 2: PERSISTÊNCIA + BOT em background ──
        # Disparado SEMPRE — independente de ws_delivered.
        # A persistência não depende da presença de um agente online.
        asyncio.create_task(
            _persist_and_run_bot(
                tenant_id=tenant_id,
                contact_phone=conv_phone,   # Usa o telefone do contato (corrigido para fromMe)
                notify_name=notify_name,
                user_input=user_input,
                external_id=external_id,
                computed_side=computed_side,
            )
        )

        return {"success": True, "status": "delivered" if ws_delivered > 0 else "persisted_no_agent"}


    # ═══════════════════════════════════════════════════════════════════════════
    # CASO 2: ACK DE ENTREGA (ON_ACK)
    # Atualização silenciosa de status — RabbitMQ aceitável aqui
    # ═══════════════════════════════════════════════════════════════════════════
    elif ws_payload.event == WhatsAppMessageEvent.ON_ACK:
        ack_body = ws_payload.payload
        logger.info(
            f"[Gateway] ✔️ ACK | msg_id='{ack_body.get('id')}' "
            f"| status={ack_body.get('status')} | tenant='{tenant_id}'"
        )
        try:
            # Converte o status do ACK numérico para MessageStatus
            from src.models.chat import MessageStatus
            ack_map = {
                1: MessageStatus.SENT,
                2: MessageStatus.DELIVERED,
                3: MessageStatus.READ,
                4: MessageStatus.ERROR
            }
            new_status = ack_map.get(ack_body.get('status', 0))
            external_id = ack_body.get('id')
            
            if new_status and external_id:
                # Atualiza status exclusivamente no MongoDB
                from src.services.message_history_service import MessageHistoryService
                await MessageHistoryService.update_message_status(external_id, new_status)
                    
                # Broadcast via Websocket para atualizar o Front-End ao vivo
                socket_payload = {
                    "method": "message_status_update",
                    "params": {
                        "message_id": external_id,
                        "status": new_status.value
                    }
                }
                await ws_manager.broadcast_to_tenant(tenant_id, socket_payload)
                
        except Exception as ack_err:
            logger.warning(f"[Gateway] ⚠️ Falha ao processar ACK: {ack_err}")
            
        return {"success": True, "status": "ack_processed"}

    # ═══════════════════════════════════════════════════════════════════════════
    # CASO 3: MUDANÇA DE ESTADO / QR CODE (ON_STATE_CHANGE)
    # ═══════════════════════════════════════════════════════════════════════════
    elif ws_payload.event == WhatsAppMessageEvent.ON_STATE_CHANGE:
        from src.models.whatsapp_events import WhatsAppSystemEvent
        from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus

        state_body = ws_payload.payload
        state   = state_body.get("state", "UNKNOWN")
        battery = state_body.get("battery")
        qrcode  = state_body.get("qrcode")

        logger.info(f"[Gateway] 🔄 State change | session='{ws_payload.session}' | state='{state}'")

        # Resolve enum de status
        try:
            new_status = WhatsAppStatus(state.lower())
        except ValueError:
            logger.warning(f"⚠️ Estado desconhecido: '{state}'. Usando DISCONNECTED.")
            new_status = WhatsAppStatus.DISCONNECTED

        # Persistência do estado no Postgres
        with SessionLocal() as db:
            try:
                instance = (
                    db.query(WhatsAppInstance)
                    .filter(WhatsAppInstance.session_name == ws_payload.session)
                    .execution_options(ignore_tenant=True)
                    .first()
                )
                if instance:
                    instance.status = new_status
                    if qrcode:
                        instance.qrcode_base64 = qrcode
                    db.commit()
                    logger.info(f"✅ Instância '{ws_payload.session}' → status={new_status.value}")
                else:
                    logger.warning(f"⚠️ Instância não encontrada: '{ws_payload.session}'")
            except Exception as e_inst:
                db.rollback()
                logger.error(f"❌ Falha ao atualizar instância: {e_inst}")

            try:
                log_details = state_body.copy()
                if qrcode and len(qrcode) > 100:
                    log_details["qrcode"] = f"{qrcode[:50]}...[TRUNCATED]"
                db.add(WhatsAppSystemEvent(
                    tenant_id=tenant_id,
                    session_name=ws_payload.session,
                    event_type=state,
                    details=json.dumps(log_details),
                ))
                db.commit()
            except Exception as e_log:
                db.rollback()
                logger.warning(f"⚠️ Log de auditoria falhou: {e_log}")

        # Notificação ao Frontend via WS (sem RabbitMQ)
        socket_payload = {
            "method": "bot_system_event",
            "params": {"event": state, "battery": battery, "session": ws_payload.session},
        }

        if state == "QRCODE" and qrcode:
            socket_payload = {
                "method": "update_bot_qr",
                "params": {"qrcode": qrcode.strip(), "session": ws_payload.session},
            }

        history_data = []
        if state == "CONNECTED":
            logger.info(f"🔄 Bot '{ws_payload.session}' conectado. Restaurando histórico...")
            history = await chat_service.get_session_history(tenant_id, ws_payload.session)
            history_data = [msg.model_dump(mode="json") for msg in history]
            socket_payload["params"]["history"] = history_data
            socket_payload["method"] = "chat_history_restored"
            logger.info(f"📚 Histórico restaurado: {len(history_data)} msg(s)")

        await ws_manager.broadcast_to_tenant(tenant_id, socket_payload)
        logger.debug(f"[Gateway] Estado '{state}' broadcast | tenant='{tenant_id}'")
        return {"success": True, "status": "processed"}

    # ═══════════════════════════════════════════════════════════════════════════
    # CASO 4: Outros eventos — ignorados silenciosamente
    # ═══════════════════════════════════════════════════════════════════════════
    logger.debug(f"[Gateway] Evento '{ws_payload.event}' sem handler. Ignorado.")
    return {"success": True, "status": "ignored"}
