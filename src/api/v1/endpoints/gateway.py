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

# O fluxo de persistência assíncrona foi movido para o loop de resposta do socket.# ─── ENDPOINT PRINCIPAL ─────────────────────────────────────────────
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

        # 1. Identifica IDs e Metadados
        is_from_me = msg_body.get("fromMe", False)
        raw_remote_jid = msg_body.get("from", "")  # JID da conversa (pode ser grupo ou pessoa)
        raw_participant = msg_body.get("participant", "") # JID de quem enviou (em caso de grupo)

        # 2. RESOLUÇÃO DO NÚMERO REAL (Phone Number vs Group ID)
        # Se eu enviei, o "contato" é quem recebeu (campo 'to')
        # Se eu recebi, o "contato" é quem enviou (campo 'from')
        if is_from_me:
            target_jid = msg_body.get("to", "")
        else:
            target_jid = raw_remote_jid

        # 3. FILTRO DE SEGURANÇA: Extrair apenas números (ignora @s.whatsapp.net, @g.us, etc)
        # Se houver um 'participant' explícito (quem realmente enviou no caso de grupos ou threads), usamos ele.
        # Caso contrário, usamos o target_jid diretamentre.
        if raw_participant:
            contact_phone = raw_participant.split("@")[0]
        else:
            contact_phone = target_jid.split("@")[0]

        # 4. Normalização Final (Remove caracteres não numéricos de segurança)
        contact_phone = "".join(filter(str.isdigit, contact_phone))

        # 5. Validação: Se o ID resultante for bizarro (vazio ou ID de sistema muito longo)
        if not contact_phone or len(contact_phone) > 15:
            # Tenta um fallback para o notifyName se o número falhar
            logger.warning(f"[Gateway] ID de contato suspeito: {contact_phone}. Ignorando entrega visual.")
            # return {"success": True, "status": "ignored_system_id"} # Opcional: silenciar se não for número real

        try:
            unified_msg = MessageNormalizer.from_whatsapp(resolved_tenant_id, msg_body)
        except Exception as norm_err:
            logger.error(f"Erro normalização: {norm_err}")
            return {"success": False, "status": "normalization_error"}

        # ── PASSO 1: RESOLUÇÃO SÍNCRONA DO CRM (POSTGRES) ──
        # Devemos tratar a mensagem e descobrir/registrar quem enviou no Banco de Dados
        # ANTES de disparar o websocket, para que o Frontend mostre o nome correto.
        notify_name = msg_body.get("pushName") or msg_body.get("notifyName") or f"ID {contact_phone[-4:]}"
        
        db_contact_name = notify_name # Fallback
        
        from src.core.database import SessionLocal
        from src.services.contact_service import ContactService
        from src.models.whatsapp import WhatsAppInstance
        from src.services.message_history_service import MessageHistoryService
        
        actual_session = f"tenant_{resolved_tenant_id}"
        
        try:
            with SessionLocal() as db:
                instance = db.query(WhatsAppInstance).filter(
                    WhatsAppInstance.tenant_id == resolved_tenant_id,
                    WhatsAppInstance.is_active == True
                ).first()
                if instance:
                    actual_session = instance.session_name

                # Busca o contato já cadastrado ou cria novo.
                db_contact = ContactService.get_or_create_contact(
                    db, resolved_tenant_id, contact_phone, name=notify_name
                )
                
                # Aproveita o nome rico consolidado do CRM para a UI
                db_contact_name = db_contact.full_name
        except Exception as pg_err:
            logger.error(f"[Gateway] Erro ao sincronizar CRM antes do Socket: {pg_err}")

        # ── PASSO 2: ENTREGA AO FRONTEND COM DADOS 100% TRATADOS ──
        socket_payload = {
            "method": "receive_message",
            "params": {
                "message_id": unified_msg.message_id,
                "conversation_id": contact_phone, # Aba do contato direto
                "contact_phone": contact_phone, 
                "contact": {
                    "id": contact_phone,
                    "full_name": db_contact_name, # Agora utiliza o nome Oficial do CRM resolvido no passo 1!
                    "phone_number": contact_phone,
                },
                "content": unified_msg.content,
                "from_me": is_from_me,
                "side": "bot" if is_from_me else "client",
                "type": unified_msg.type.value if hasattr(unified_msg.type, "value") else "text",
                "timestamp": msg_body.get("timestamp"),
            },
        }

        # Busca a referência do WebSocket e entrega
        ws_delivered = await ws_manager.broadcast_to_tenant(resolved_tenant_id, socket_payload)

        if ws_delivered > 0:
            logger.info(f"[Gateway] ✅ Entregue ao Front-End | {db_contact_name} ({contact_phone}) | Sockets: {ws_delivered}")

        # ── PASSO 3: PERSISTÊNCIA EM BACKGROUND ──
        # (Somente se não for mensagem minha para não duplicar no banco)
        if not is_from_me:
            # Separamos as partes assíncronas puras daqui em diante
            async def _bg_tasks():
                # Persistência MongoDB
                try:
                    await MessageHistoryService.record_message(
                        contact_phone=contact_phone,
                        content=unified_msg.content,
                        side=MessageSide.CLIENT,
                        external_id=unified_msg.message_id,
                        session_name=actual_session,
                        contact_name=db_contact_name,
                    )
                except Exception as mongo_err:
                    logger.error(f"[BG] Falha MongoDB: {mongo_err}")

                # Execução do Fluxo/Bot
                try:
                    from src.models.mongo.flow import FlowDocument
                    from src.services.session_service import SessionService
                    from src.services.flow_executor import FlowExecutor

                    flow = await FlowDocument.find_one(FlowDocument.tenant_id == resolved_tenant_id, FlowDocument.is_active == True)
                    if flow:
                        session = await SessionService.get_or_create_session(resolved_tenant_id, contact_phone, str(flow.id))
                        if not session.is_human_support:
                            executor = FlowExecutor(flow)
                            await executor.run_step(session, user_input=unified_msg.content)
                except Exception as bot_err:
                    logger.error(f"[BG] Erro FluxoBot: {bot_err}")

            asyncio.create_task(_bg_tasks())

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