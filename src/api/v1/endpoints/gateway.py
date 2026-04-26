"""
Gateway de Webhooks — Ponto de entrada para eventos do Baileys/WhatsApp.

CORREÇÃO MULTI-TENANT (Bug Root-Cause):
  O bug que impedia os tenants 2, 3, ... de receber mensagens estava
  na resolução do tenant_id a partir do campo 'session'.

  Formato do session_name: "tenant_{tenant_id}_{uuid[:8]}"
  Exemplo: "tenant_7_a3f2c1d4" ou "tenant_abc-123_ff112233"

  O parser antigo usava split("_")[1] — CORRETO para IDs numéricos simples,
  mas QUEBRA se o tenant_id contiver underscores (ex: tenant_abc_def → partes[1]="abc", perde "_def").

  FIX: removeprefix("tenant_") + rstrip do sufixo UUID (8 chars) via rsplit("_", 1)[0].
  Isso é seguro para qualquer formato de tenant_id.

  SEGUNDO BUG: O bridge Node.js não envia 'tenant_id' no corpo do webhook.
  Solução dupla: (1) parser robusto via session name, (2) instrução para o bridge
  incluir tenant_id no payload (feita em normalize_webhook_payload).

ISOLAMENTO MULTI-TENANT:
  Cada mensagem é roteada EXCLUSIVAMENTE para o tenant cujo session_name
  está registrado no banco. O broadcast_to_tenant usa o tenant_id como chave
  direta no dicionário — garantindo isolamento completo entre tenants.
"""

from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from src.schemas.whatsapp import WhatsAppPayload, WhatsAppMessageEvent
from src.services.message_normalizer import MessageNormalizer
from src.core.tenancy import get_current_tenant_id, set_current_tenant_id
from src.core.database import SessionLocal
from src.core.ws import ws_manager
from src.workers.flow_worker import flow_worker
from src.models.chat import MessageSide
from loguru import logger
import asyncio

router = APIRouter()

# ─── Autenticação do Webhook ────────────────────────────────────────────────
GATEWAY_API_KEY = "SaaS_Secret_Gateway_Key_2026"

# ─── Mapeamento de eventos Baileys → interno ─────────────────────────────────
_EVENT_ALIAS_MAP = {
    "messages.upsert":   WhatsAppMessageEvent.ON_MESSAGE,
    "messages.update":   WhatsAppMessageEvent.ON_ACK,
    "connection.update": WhatsAppMessageEvent.ON_STATE_CHANGE,
    "on_message":        WhatsAppMessageEvent.ON_MESSAGE,
    "on_ack":            WhatsAppMessageEvent.ON_ACK,
    "on_state_change":   WhatsAppMessageEvent.ON_STATE_CHANGE,
    "on_incoming_call":  WhatsAppMessageEvent.ON_INCOMING_CALL,
}


def verify_gateway_key(x_api_key: str = Header(...)):
    if x_api_key != GATEWAY_API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Gateway API Key")
    return x_api_key


def _resolve_tenant_id(raw_body: dict) -> str:
    """
    Resolve o tenant_id a partir do corpo do webhook.

    Prioridade:
      1. Campo 'tenant_id' explícito no body (o mais confiável — bridge deve enviar este).
      2. Parsing robusto do campo 'session' no formato "tenant_{id}_{uuid8}".

    PARSING ROBUSTO (evita o bug do split("_")[1]):
      - session: "tenant_7_a3f2c1d4"       → tenant_id = "7"
      - session: "tenant_abc-123_ff112233"  → tenant_id = "abc-123"
      - session: "tenant_my_id_ff112233"    → tenant_id = "my_id"  (com underscore no id)

      Algoritmo: remove prefixo "tenant_" e depois remove o sufixo "_<uuid8>"
      usando rsplit("_", 1)[0] — corta apenas o ÚLTIMO underscore.
    """
    # Prioridade 1: campo explícito
    tenant_id = str(raw_body.get("tenant_id", "")).strip()
    if tenant_id:
        return tenant_id

    # Prioridade 2: parsing do session name
    session_str = str(raw_body.get("session", "")).strip()
    if session_str.startswith("tenant_"):
        # Remove o prefixo "tenant_"
        without_prefix = session_str[len("tenant_"):]  # "7_a3f2c1d4" ou "abc-123_ff112233"

        # Remove o sufixo "_<uuid8>" (apenas o último segmento com 8 chars hex)
        # rsplit("_", 1) divide no ÚLTIMO underscore — seguro para IDs com underscores
        parts = without_prefix.rsplit("_", 1)
        if len(parts) == 2 and len(parts[1]) == 8:
            # O sufixo tem exatamente 8 chars (formato uuid hex[:8]) → remove
            return parts[0]
        else:
            # Formato sem sufixo uuid (ex: "tenant_7") → usa tudo após "tenant_"
            return without_prefix

    return ""


def normalize_webhook_payload(raw: dict) -> dict:
    """Normaliza o payload recebido para o formato interno."""
    event_raw  = raw.get("event", "")
    event_enum = _EVENT_ALIAS_MAP.get(str(event_raw).lower(), WhatsAppMessageEvent.ON_MESSAGE)

    msg_payload = raw.get("payload") or raw.get("data") or {}
    session     = raw.get("session", "")

    return {"event": event_enum.value, "session": session, "payload": msg_payload}


# ─── ENDPOINT PRINCIPAL ──────────────────────────────────────────────────────
@router.post("/webhook/{channel_type}", status_code=status.HTTP_202_ACCEPTED)
async def incoming_webhook(
    channel_type: str,
    request: Request,
    api_key: str = Depends(verify_gateway_key),
) -> Any:
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # ── Resolução do Tenant ID (multi-tenant safe) ────────────────────────────
    resolved_tenant_id = _resolve_tenant_id(payload)

    if not resolved_tenant_id:
        logger.error(
            f"[Gateway] Webhook sem Tenant ID identificável. "
            f"session='{payload.get('session')}' | event='{payload.get('event')}'"
        )
        return {"success": False, "status": "missing_tenant"}

    set_current_tenant_id(resolved_tenant_id)

    if channel_type != "whatsapp":
        return {"success": True, "status": "ignored"}

    normalized  = normalize_webhook_payload(payload)
    ws_payload  = WhatsAppPayload(**normalized)

    logger.debug(
        f"[Gateway] Evento '{ws_payload.event}' recebido | "
        f"tenant='{resolved_tenant_id}' | session='{ws_payload.session}'"
    )

    # ═════════════════════════════════════════════════════════════════════════
    # CASO 1: MENSAGEM RECEBIDA (ON_MESSAGE)
    # ═════════════════════════════════════════════════════════════════════════
    if ws_payload.event == WhatsAppMessageEvent.ON_MESSAGE:
        msg_body  = ws_payload.payload
        is_from_me = msg_body.get("fromMe", False)

        # Resolve JID e número de telefone do contato
        target_jid     = msg_body.get("to") if is_from_me else msg_body.get("from", "")
        participant_jid = msg_body.get("participant", "")

        if "@g.us" in target_jid and participant_jid:
            contact_phone = participant_jid.split("@")[0]
        else:
            contact_phone = target_jid.split("@")[0]

        contact_phone = "".join(filter(str.isdigit, contact_phone))

        if not contact_phone:
            logger.warning(f"[Gateway] JID inválido ignorado | tenant='{resolved_tenant_id}'")
            return {"success": True, "status": "ignored_invalid_jid"}

        # Busca nome do contato no Postgres deste tenant (isolamento multi-tenant)
        contact_display_name = None
        try:
            with SessionLocal() as db:
                from src.models.contact import Contact
                local_contact = db.query(Contact).filter_by(
                    tenant_id=resolved_tenant_id,
                    phone_number=contact_phone
                ).first()
                if local_contact and local_contact.full_name:
                    contact_display_name = local_contact.full_name
        except Exception as e:
            logger.error(f"[Gateway] Falha ao consultar nome do contato: {e}")

        if not contact_display_name:
            contact_display_name = (
                msg_body.get("pushName")
                or msg_body.get("notifyName")
                or f"Contato {contact_phone[-4:]}"
            )

        unified_msg = MessageNormalizer.from_whatsapp(resolved_tenant_id, msg_body)

        # ── ENTREGA AO FRONTEND (isolada por tenant_id) ───────────────────────
        socket_payload = {
            "method": "receive_message",
            "params": {
                "message_id":   unified_msg.message_id,
                "conversation_id": target_jid,
                "contact_phone":   contact_phone,
                "contact": {
                    "id":          contact_phone,
                    "full_name":   contact_display_name,
                    "phone_number": contact_phone,
                },
                "content":    unified_msg.content,
                "from_me":    is_from_me,
                "side":       "bot" if is_from_me else "client",
                "type":       unified_msg.type.value,
                "timestamp":  msg_body.get("timestamp"),
                "tenant_id":  resolved_tenant_id,   # inclui para debug no frontend
            },
        }

        delivered = await ws_manager.broadcast_to_tenant(resolved_tenant_id, socket_payload)
        logger.info(
            f"[Gateway] Mensagem de '{contact_phone}' → tenant='{resolved_tenant_id}' "
            f"| from_me={is_from_me} | entregue para {delivered} socket(s)"
        )

        # ── PERSISTÊNCIA E BOT EM BACKGROUND (não bloqueia a resposta) ───────
        if not is_from_me:
            worker_payload = {
                "tenant_id": resolved_tenant_id,
                "data": {
                    "from_id": contact_phone,
                    "content": unified_msg.content,
                    "message_id": unified_msg.message_id,
                    "from_me": is_from_me,
                    "notify_name": contact_display_name,
                    "type": unified_msg.type.value
                }
            }
            asyncio.create_task(flow_worker.handle_incoming_message(worker_payload))
            
        return {"success": True, "status": "processed"}

    # ═════════════════════════════════════════════════════════════════════════
    # CASO 2: ACK DE ENTREGA/LEITURA (ON_ACK)
    # ═════════════════════════════════════════════════════════════════════════
    elif ws_payload.event == WhatsAppMessageEvent.ON_ACK:
        asyncio.create_task(ws_manager.broadcast_to_tenant(resolved_tenant_id, {
            "method": "message_status_update",
            "params": {
                "message_id": ws_payload.payload.get("id"),
                "status":     ws_payload.payload.get("status"),
                "tenant_id":  resolved_tenant_id,
            },
        }))
        return {"success": True, "status": "ack_notified"}

    # ═════════════════════════════════════════════════════════════════════════
    # CASO 3: MUDANÇA DE ESTADO DA SESSÃO (ON_STATE_CHANGE)
    # ═════════════════════════════════════════════════════════════════════════
    elif ws_payload.event == WhatsAppMessageEvent.ON_STATE_CHANGE:
        state = ws_payload.payload.get("state")
        qr    = ws_payload.payload.get("qrcode")
        evt_method = "update_bot_qr" if state == "QRCODE" else "bot_system_event"
        await ws_manager.broadcast_to_tenant(resolved_tenant_id, {
            "method": evt_method,
            "params": {
                "qrcode":    qr,
                "event":     state,
                "session":   ws_payload.session,
                "tenant_id": resolved_tenant_id,
            },
        })
        return {"success": True, "status": "state_notified"}

    # ═════════════════════════════════════════════════════════════════════════
    # CASO 4: CHAMADA RECEBIDA (ON_INCOMING_CALL)
    # ═════════════════════════════════════════════════════════════════════════
    elif ws_payload.event == WhatsAppMessageEvent.ON_INCOMING_CALL:
        call_body   = ws_payload.payload
        caller_jid  = call_body.get("from", "")
        caller_phone = caller_jid.split("@")[0] if "@" in caller_jid else caller_jid
        caller_phone = "".join(filter(str.isdigit, caller_phone))

        caller_name = f"Contato {caller_phone[-4:]}" if len(caller_phone) >= 4 else caller_phone
        try:
            with SessionLocal() as db:
                from src.models.contact import Contact
                local_contact = db.query(Contact).filter_by(
                    tenant_id=resolved_tenant_id,
                    phone_number=caller_phone
                ).first()
                if local_contact and local_contact.full_name:
                    caller_name = local_contact.full_name
        except Exception as e:
            logger.error(f"[Gateway] Falha ao enriquecer nome do autor da chamada: {e}")

        logger.info(
            f"📞 [Gateway] Chamada de {caller_name} ({caller_phone}) "
            f"→ tenant='{resolved_tenant_id}'"
        )

        await ws_manager.broadcast_to_tenant(resolved_tenant_id, {
            "method": "incoming_call",
            "params": {
                "call_id":   call_body.get("call_id"),
                "from": {
                    "jid":   caller_jid,
                    "phone": caller_phone,
                    "name":  caller_name,
                },
                "is_video":  call_body.get("is_video", False),
                "timestamp": call_body.get("timestamp"),
                "tenant_id": resolved_tenant_id,
            },
        })
        return {"success": True, "status": "call_notified"}

    return {"success": True, "status": "ignored_event"}