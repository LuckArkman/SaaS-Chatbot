"""
Gateway de Webhooks — Ponto de entrada para eventos do Baileys/WhatsApp.

Fluxo de entrega de mensagens (ON_MESSAGE):
  1. Baileys → POST /webhook/whatsapp
  2. Gateway extrai e resolve o Tenant ID (Chave do Dicionário)
  3. ✅ Entrega IMEDIATA ao Frontend via WebSocket RPC (usando a chave resolvida)
  4. 🗄️  Background Task para persistência e lógica de Bot/IA
"""

from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from src.schemas.whatsapp import WhatsAppPayload, WhatsAppMessageEvent
from src.services.message_normalizer import MessageNormalizer
from src.core.tenancy import get_current_tenant_id, set_current_tenant_id
from src.core.database import SessionLocal
from src.core.ws import ws_manager
from src.services.chat_service import ChatService
from src.models.chat import MessageSide
from loguru import logger
import json
import asyncio

router = APIRouter()

# ─── Autenticação do Webhook ────────────────────────────────────────
GATEWAY_API_KEY = "SaaS_Secret_Gateway_Key_2026"

# ─── Mapeamento de eventos Baileys → interno ────────────────────────
_EVENT_ALIAS_MAP = {
    "messages.upsert":   WhatsAppMessageEvent.ON_MESSAGE,
    "messages.update":   WhatsAppMessageEvent.ON_ACK,
    "connection.update": WhatsAppMessageEvent.ON_STATE_CHANGE,
}

def verify_gateway_key(x_api_key: str = Header(...)):
    if x_api_key != GATEWAY_API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Gateway API Key")
    return x_api_key

def normalize_webhook_payload(raw: dict) -> dict:
    """Normaliza o payload recebido para o formato interno."""
    event_raw = raw.get("event", "")
    event_enum = _EVENT_ALIAS_MAP.get(str(event_raw).lower(), WhatsAppMessageEvent.ON_MESSAGE)

    msg_payload = raw.get("payload") or raw.get("data") or {}
    session = raw.get("session", "")

    return {"event": event_enum.value, "session": session, "payload": msg_payload}

# ─── ENDPOINT PRINCIPAL ─────────────────────────────────────────────
@router.post("/webhook/{channel_type}", status_code=status.HTTP_202_ACCEPTED)
async def incoming_webhook(
    channel_type: str,
    request: Request,
    api_key: str = Depends(verify_gateway_key),
) -> Any:
    try:
        payload = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # ── Resolução Estrita do Tenant ID ──
    resolved_tenant_id = ""
    if "tenant_id" in payload and payload["tenant_id"]:
        resolved_tenant_id = str(payload["tenant_id"])
    if not resolved_tenant_id:
        session_str = str(payload.get("session", ""))
        if session_str.startswith("tenant_"):
            parts = session_str.split("_")
            if len(parts) >= 2:
                resolved_tenant_id = parts[1]

    if not resolved_tenant_id:
        logger.error("[Gateway] Webhook sem identificação de Tenant ID.")
        return {"success": False, "status": "missing_tenant"}

    set_current_tenant_id(resolved_tenant_id)

    if channel_type != "whatsapp":
        return {"success": True, "status": "ignored"}

    normalized = normalize_webhook_payload(payload)
    ws_payload = WhatsAppPayload(**normalized)

    # ═════════════════════════════════════════════════════════════════
    # CASO 1: MENSAGEM RECEBIDA (ON_MESSAGE)
    # ═════════════════════════════════════════════════════════════════
    if ws_payload.event == WhatsAppMessageEvent.ON_MESSAGE:
        msg_body = ws_payload.payload
        is_from_me = msg_body.get("fromMe", False)

        # Resolve JID e número de telefone do contato
        target_jid = msg_body.get("to") if is_from_me else msg_body.get("from", "")
        participant_jid = msg_body.get("participant", "")

        if "@g.us" in target_jid and participant_jid:
            contact_phone = participant_jid.split("@")[0]
        else:
            contact_phone = target_jid.split("@")[0]

        contact_phone = "".join(filter(str.isdigit, contact_phone))

        if not contact_phone:
            return {"success": True, "status": "ignored_invalid_jid"}

        # Busca o nome do contato no banco de dados (PostgreSQL)
        contact_display_name = None
        try:
            with SessionLocal() as db:
                from src.models.contact import Contact
                local_contact = db.query(Contact).filter_by(tenant_id=resolved_tenant_id, phone_number=contact_phone).first()
                if local_contact and local_contact.full_name:
                    contact_display_name = local_contact.full_name
        except Exception as e:
            logger.error(f"[Gateway] Falha ao consultar nome do contato no DB: {e}")

        if not contact_display_name:
            contact_display_name = msg_body.get("pushName") or msg_body.get("notifyName") or f"Contato {contact_phone[-4:]}"

        unified_msg = MessageNormalizer.from_whatsapp(resolved_tenant_id, msg_body)

        # ── PASSO 1: ENTREGA AO FRONTEND COM O NOME CORRETO ──
        socket_payload = {
            "method": "receive_message",
            "params": {
                "message_id": unified_msg.message_id,
                "conversation_id": target_jid,
                "contact_phone": contact_phone,
                "contact": {"id": contact_phone, "full_name": contact_display_name, "phone_number": contact_phone},
                "content": unified_msg.content,
                "from_me": is_from_me,
                "side": "bot" if is_from_me else "client",
                "type": unified_msg.type.value,
                "timestamp": msg_body.get("timestamp"),
            },
        }

        await ws_manager.broadcast_to_tenant(resolved_tenant_id, socket_payload)

        # ── PASSO 2: PERSISTÊNCIA EM BACKGROUND ──
        if not is_from_me:
            asyncio.create_task(
                ChatService.handle_incoming_message(
                    tenant_id=resolved_tenant_id,
                    contact_phone=contact_phone,
                    notify_name=contact_display_name,
                    user_input=unified_msg.content,
                    external_id=unified_msg.message_id,
                )
            )
        return {"success": True, "status": "processed"}

    # ═════════════════════════════════════════════════════════════════
    # CASO 2: ACKS E ESTADO
    # ═════════════════════════════════════════════════════════════════
    elif ws_payload.event == WhatsAppMessageEvent.ON_ACK:
        asyncio.create_task(ws_manager.broadcast_to_tenant(resolved_tenant_id, {
            "method": "message_status_update",
            "params": {"message_id": ws_payload.payload.get("id"), "status": ws_payload.payload.get("status")}
        }))
        return {"success": True, "status": "ack_notified"}

    elif ws_payload.event == WhatsAppMessageEvent.ON_STATE_CHANGE:
        state = ws_payload.payload.get("state")
        qr = ws_payload.payload.get("qrcode")
        evt_method = "update_bot_qr" if state == "QRCODE" else "bot_system_event"
        await ws_manager.broadcast_to_tenant(resolved_tenant_id, {
            "method": evt_method,
            "params": {"qrcode": qr, "event": state, "session": ws_payload.session}
        })
        return {"success": True, "status": "state_notified"}

    return {"success": True, "status": "ignored_event"}