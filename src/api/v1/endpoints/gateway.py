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
from src.services.chat_service import chat_service
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

# ─── BACKGROUND TASK: Persistência e IA ─────────────────────────────
async def _persist_and_run_bot(
    tenant_id: str,
    contact_phone: str,
    notify_name: str,
    user_input: str,
    external_id: str,
    computed_side: MessageSide,
):
    """Executado em background após a entrega ao Frontend via WS."""
    from src.models.whatsapp import WhatsAppInstance
    from src.services.contact_service import ContactService
    from src.services.message_history_service import MessageHistoryService

    actual_session = f"tenant_{tenant_id}"
    try:
        with SessionLocal() as db:
            instance = db.query(WhatsAppInstance).filter(
                WhatsAppInstance.tenant_id == tenant_id,
                WhatsAppInstance.is_active == True
            ).first()
            if instance:
                actual_session = instance.session_name

            # Upsert do contato
            ContactService.get_or_create_contact(db, tenant_id, contact_phone, name=notify_name)
    except Exception as pg_err:
        logger.warning(f"[BG] Falha infra Postgres: {pg_err}")

    # Persistência MongoDB
    try:
        await MessageHistoryService.record_message(
            contact_phone=contact_phone,
            content=user_input,
            side=computed_side,
            external_id=external_id,
            session_name=actual_session,
        )
    except Exception as mongo_err:
        logger.error(f"[BG] Falha MongoDB: {mongo_err}")

    # Execução do Fluxo/Bot
    try:
        from src.models.mongo.flow import FlowDocument
        from src.services.session_service import SessionService
        from src.services.flow_executor import FlowExecutor

        flow = await FlowDocument.find_one(FlowDocument.tenant_id == tenant_id, FlowDocument.is_active == True)
        if flow:
            session = await SessionService.get_or_create_session(tenant_id, contact_phone, str(flow.id))
            if not session.is_human_support:
                executor = FlowExecutor(flow)
                await executor.run_step(session, user_input=user_input)
    except Exception as bot_err:
        logger.error(f"[BG] Erro FluxoBot: {bot_err}")


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

    # ── [CORREÇÃO] Resolução Estrita do Tenant ID para o Dicionário WS ──
    resolved_tenant_id = ""

    # 1. Tenta pegar do campo direto
    if "tenant_id" in payload and payload["tenant_id"]:
        resolved_tenant_id = str(payload["tenant_id"])

    # 2. Tenta extrair da string de sessão (tenant_ID_suffix)
    if not resolved_tenant_id:
        session_str = str(payload.get("session", ""))
        if session_str.startswith("tenant_"):
            parts = session_str.split("_")
            if len(parts) >= 2:
                resolved_tenant_id = parts[1]

    if not resolved_tenant_id:
        logger.error("[Gateway] Webhook sem identificação de Tenant ID.")
        return {"success": False, "status": "missing_tenant"}

    # Define o contexto global de Tenancy
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

        # Ignora grupos/broadcasts
        if bool(msg_body.get("isGroupMsg", False)):
            return {"success": True, "status": "ignored_group"}

        try:
            unified_msg = MessageNormalizer.from_whatsapp(resolved_tenant_id, msg_body)
        except Exception as norm_err:
            logger.error(f"Erro normalização: {norm_err}")
            return {"success": False, "status": "normalization_error"}

        is_from_me = msg_body.get("fromMe", False)
        contact_phone = unified_msg.from_id.split("@")[0] if "@" in unified_msg.from_id else unified_msg.from_id

        # Resolve JID da conversa
        to_id = msg_body.get("to", "")
        from_id = msg_body.get("from", "")
        conv_jid = to_id if is_from_me else from_id
        conv_phone = conv_jid.split("@")[0] if "@" in conv_jid else conv_jid

        # ── PASSO 1: ENTREGA IMEDIATA AO FRONTEND (Via Dicionário WS) ──
        socket_payload = {
            "method": "receive_message",
            "params": {
                "message_id": unified_msg.message_id,
                "conversation_id": conv_jid,
                "contact_phone": conv_phone,
                "content": unified_msg.content,
                "from_me": is_from_me,
                "side": "bot" if is_from_me else "client",
                "type": unified_msg.type.value if hasattr(unified_msg.type, "value") else "text",
                "timestamp": msg_body.get("timestamp"),
            },
        }

        # Busca a referência do WebSocket no dicionário usando a chave resolvida
        ws_delivered = await ws_manager.broadcast_to_tenant(resolved_tenant_id, socket_payload)

        if ws_delivered > 0:
            logger.info(f"[Gateway] ✅ Entregue ao Front-End ({resolved_tenant_id}) | Sockets: {ws_delivered}")
        else:
            logger.warning(f"[Gateway] ⚠️ Mensagem recebida mas nenhum Front-End ativo para o Tenant '{resolved_tenant_id}' no dicionário.")

        # ── PASSO 2: PERSISTÊNCIA EM BACKGROUND ──
        if not is_from_me:
            asyncio.create_task(
                _persist_and_run_bot(
                    tenant_id=resolved_tenant_id,
                    contact_phone=conv_phone,
                    notify_name=msg_body.get("pushName", "Contato"),
                    user_input=unified_msg.content,
                    external_id=unified_msg.message_id,
                    computed_side=MessageSide.CLIENT,
                )
            )

        return {"success": True, "status": "processed"}

    # ═════════════════════════════════════════════════════════════════
    # CASO 2: ACKS E ESTADO
    # ═════════════════════════════════════════════════════════════════
    elif ws_payload.event == WhatsAppMessageEvent.ON_ACK:
        # Atualização de status silenciosa
        asyncio.create_task(ws_manager.broadcast_to_tenant(resolved_tenant_id, {
            "method": "message_status_update",
            "params": {"message_id": ws_payload.payload.get("id"), "status": ws_payload.payload.get("status")}
        }))
        return {"success": True, "status": "ack_notified"}

    elif ws_payload.event == WhatsAppMessageEvent.ON_STATE_CHANGE:
        # Notifica mudança de QR ou Conexão
        state = ws_payload.payload.get("state")
        qr = ws_payload.payload.get("qrcode")

        evt_method = "update_bot_qr" if state == "QRCODE" else "bot_system_event"
        await ws_manager.broadcast_to_tenant(resolved_tenant_id, {
            "method": evt_method,
            "params": {"qrcode": qr, "event": state, "session": ws_payload.session}
        })
        return {"success": True, "status": "state_notified"}

    return {"success": True, "status": "ignored_event"}