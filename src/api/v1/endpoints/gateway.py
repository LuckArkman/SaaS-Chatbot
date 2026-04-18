from typing import Any, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, status
from src import schemas
from src.schemas.whatsapp import WhatsAppPayload, WhatsAppMessageEvent, WhatsAppAckStatus
from src.services.message_normalizer import MessageNormalizer
from src.core.bus import rabbitmq_bus
from src.core.tenancy import get_current_tenant_id, set_current_tenant_id
from src.core.database import SessionLocal
from loguru import logger
import json
import asyncio
from src.services.chat_service import chat_service
from src.models.mongo.chat import MessageSource

router = APIRouter()


# API Key simples para validação de webhooks (Pode ser migrada para DB depois)
GATEWAY_API_KEY = "SaaS_Secret_Gateway_Key_2026"

# Mapeamento de aliases de evento → formato canônico interno
# Aceita tanto o formato Baileys raw quanto o do painel UTalk/simulador
_EVENT_ALIAS_MAP = {
    # Mensagem recebida
    "messages.upsert":    WhatsAppMessageEvent.ON_MESSAGE,
    "message.upsert":     WhatsAppMessageEvent.ON_MESSAGE,
    "on_message":         WhatsAppMessageEvent.ON_MESSAGE,
    # ACK de entrega
    "messages.update":    WhatsAppMessageEvent.ON_ACK,
    "message.update":     WhatsAppMessageEvent.ON_ACK,
    "on_ack":             WhatsAppMessageEvent.ON_ACK,
    # Mudança de estado / QR
    "connection.update":  WhatsAppMessageEvent.ON_STATE_CHANGE,
    "on_state_change":    WhatsAppMessageEvent.ON_STATE_CHANGE,
    # Chamada
    "on_incoming_call":   WhatsAppMessageEvent.ON_INCOMING_CALL,
}


def verify_gateway_key(x_api_key: str = Header(...)):
    if x_api_key != GATEWAY_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Gateway API Key"
        )
    return x_api_key


def normalize_webhook_payload(raw: dict) -> dict:
    """
    Normaliza o payload recebido para o formato esperado por WhatsAppPayload.

    Aceita múltiplos formatos:
    - Formato canônico do Bridge Baileys:  {event, session, payload}
    - Formato do painel UTalk/simulador:   {event, data, tenant_id, ...}
    - Formato raw Baileys 6.x on_message:  {event: "messages.upsert", data: {...}}

    Retorna sempre: {event (enum value), session (str), payload (dict)}.
    """
    event_raw = raw.get("event", "")

    # 1. Resolve alias de evento → enum canônico
    event_enum = _EVENT_ALIAS_MAP.get(str(event_raw).lower())
    if not event_enum:
        # Tentativa de matching parcial como last-resort
        for alias, mapped in _EVENT_ALIAS_MAP.items():
            if alias in str(event_raw).lower():
                event_enum = mapped
                break
    if not event_enum:
        logger.warning(
            f"[Gateway] Evento desconhecido '{event_raw}' — assumindo on_message como fallback."
        )
        event_enum = WhatsAppMessageEvent.ON_MESSAGE

    # 2. Resolve o campo de payload (pode vir como 'payload' ou 'data')
    msg_payload = raw.get("payload") or raw.get("data") or {}

    # 3. Resolve session (pode ser derivado do tenant_id no body)
    session = raw.get("session", "")
    if not session:
        body_tenant = raw.get("tenant_id", "")
        if body_tenant:
            session = f"tenant_{body_tenant}"
        else:
            session = "unknown_session"

    normalized = {
        "event":   event_enum.value,
        "session": session,
        "payload": msg_payload,
    }

    logger.debug(
        f"[Gateway] Payload normalizado | evento='{event_raw}'→'{event_enum.value}' "
        f"| session='{session}' | payload_keys={list(msg_payload.keys())}"
    )
    return normalized


from fastapi import Request

@router.post("/webhook/{channel_type}", status_code=status.HTTP_202_ACCEPTED)
async def incoming_webhook(
    channel_type: str,
    request: Request,
    api_key: str = Depends(verify_gateway_key)
) -> Any:
    """
    Endpoint de Webhook especializado para WhatsApp (Venom/Evolution) e outros canais.

    Aceita tanto o formato canônico do Bridge Baileys quanto o formato do painel
    UTalk/simulador.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # ─── Resolução de Tenant ID Global ──────────────────────────────────────────
    # Prioridade: 1) Middleware (JWT/Header) → 2) Campo 'tenant_id' no body → 3) Sessão (CRÍTICO)
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        tenant_id = payload.get("tenant_id", "")
        
        # 3. Deriva tenant via nome da sessão para suportar cross-tenancy via Baileys Webhook
        session_str = str(payload.get("session", ""))
        if not tenant_id and session_str.startswith("tenant_"):
            parts = session_str.split("_")
            tenant_id = parts[1] if len(parts) >= 2 else ""

        if tenant_id:
            set_current_tenant_id(tenant_id)
            logger.info(f"[Gateway] tenant_id resolvido da origem/sessão: '{tenant_id}'")
        else:
            logger.warning(
                "[Gateway] tenant_id ausente no middleware, request e na sessão. "
                "O evento prosseguirá com contexto possivelmente falho."
            )

    logger.info(
        f"[Gateway] ▶ Webhook recebido | channel='{channel_type}' "
        f"| tenant='{tenant_id}' | event_raw='{payload.get('event')}'"
    )

    # 🎯 1. Tratamento específico para WhatsApp
    if channel_type == "whatsapp":
        try:
            # Normaliza antes de parsear — suporta múltiplos formatos de entrada
            normalized = normalize_webhook_payload(payload)
            ws_payload = WhatsAppPayload(**normalized)

            logger.debug(
                f"[Gateway] ✅ WhatsAppPayload válido | event={ws_payload.event} "
                f"| session='{ws_payload.session}'"
            )

            # ── Mensagem recebida ──────────────────────────────────────────
            if ws_payload.event == WhatsAppMessageEvent.ON_MESSAGE:
                msg_body = ws_payload.payload

                # 🔧 Proteção Crítica: Ignorar mensagens de sistema, grupos, comunidades e newsletters
                from_id = msg_body.get("from", "")
                is_group = bool(msg_body.get("isGroupMsg", False))
                
                # JIDs permitidos no SaaS são apenas contatos diretos (terminados em s.whatsapp.net ou c.us, ou números puros)
                # JIDs do tipo @g.us (grupos), @newsletter (canais), @broadcast (status), @lid, etc. causam ID clash no frontend
                if is_group or ("@" in from_id and from_id.split("@")[1] not in ["s.whatsapp.net", "c.us"]):
                    logger.debug(f"🔇 Bloqueando mensagem não suportada de grupo/sistema: {from_id}")
                    return {"success": True, "status": "ignored"}

                # Normalização para UnifiedMessage
                unified_msg = MessageNormalizer.from_whatsapp(tenant_id, msg_body)
                logger.info(f"[Gateway] 📨 Mensagem unificada | id='{unified_msg.message_id}' | from='{unified_msg.from_id}' | tenant='{tenant_id}'")

                # --- 🚀 ENTREGA DIRETA AO FRONTEND E BANCO DE DADOS (DB + WS) ---
                # A mensagem é resolvida e entregue IMEDIATAMENTE, desvinculando o histórico  
                # de conversas do fluxo de automação dentro das filas do RabbitMQ.
                from src.services.contact_service import ContactService
                from src.services.message_history_service import MessageHistoryService
                from src.models.whatsapp import WhatsAppInstance
                from src.models.chat import MessageSide
                from src.core.ws import ws_manager
                import asyncio

                try:
                    is_from_me = msg_body.get("fromMe", False)
                    user_input = unified_msg.content
                    external_id = unified_msg.message_id
                    computed_side = MessageSide.AGENT if is_from_me else MessageSide.CLIENT
                    contact_phone = unified_msg.from_id
                    if "@" in contact_phone:
                        contact_phone = contact_phone.split("@")[0]
                        
                    # 1. 🚀 ENTREGA IMEDIATA AO FRONTEND (Bypass Total DB/Filas)
                    # A UI renderiza instantaneamente SEM bloquear em banco ou fila
                    notify_name = msg_body.get("pushName") or msg_body.get("notifyName") or "Contato S/ Nome"
                    
                    socket_payload = {
                        "method": "receive_message",
                        "params": {
                            "message_id": external_id,
                            "conversation_id": contact_phone,
                            "contact_phone": contact_phone,
                            "contact": {
                                "id": contact_phone,
                                "full_name": notify_name,
                                "phone_number": contact_phone
                            },
                            "content": user_input,
                            "from_me": is_from_me,
                            "side": "bot" if is_from_me else "client",
                            "type": unified_msg.type.value if hasattr(unified_msg.type, 'value') else "text",
                            "caption": unified_msg.caption,
                            "timestamp": msg_body.get("timestamp"),
                            "metadata": unified_msg.metadata
                        }
                    }
                    await ws_manager.broadcast_to_tenant(tenant_id, socket_payload)
                    logger.info(f"[Gateway] 🟢 FRONTEND PRIMEIRO: entregue imediatamente | {contact_phone}")

                    # 2. 🗃️ PERSISTÊNCIA + BOT em Background (fila somente para gravar dados)
                    async def _background_persistence_and_bot():
                        try:
                            for attempt in range(3):
                                try:
                                    with SessionLocal() as db:
                                        from src.models.whatsapp import WhatsAppInstance
                                        from src.services.contact_service import ContactService
                                        from src.services.message_history_service import MessageHistoryService
                                        
                                        instance = db.query(WhatsAppInstance).filter(
                                            WhatsAppInstance.tenant_id == tenant_id,
                                            WhatsAppInstance.is_active == True
                                        ).order_by(WhatsAppInstance.id.desc()).execution_options(ignore_tenant=True).first()
                                        
                                        actual_session = instance.session_name if instance else f"tenant_{tenant_id}"
                                        ContactService.get_or_create_contact(db, tenant_id, contact_phone, name=notify_name)
                                        await MessageHistoryService.record_message(
                                            db=db, contact_phone=contact_phone, content=user_input,
                                            side=computed_side, external_id=external_id, session_name=actual_session
                                        )
                                        MessageHistoryService.get_or_create_conversation(db, contact_phone)
                                        break
                                except Exception as db_err:
                                    if attempt < 2:
                                        await asyncio.sleep(0.1)
                                    else:
                                        logger.error(f"❌ Erro ao persistir DB (Background): {db_err}")

                            # Execução do Bot/Fluxo IA
                            from src.models.mongo.flow import FlowDocument
                            from src.services.session_service import SessionService
                            from src.services.flow_executor import FlowExecutor
                            
                            flow = await FlowDocument.find_one(
                                FlowDocument.tenant_id == tenant_id,
                                FlowDocument.is_active == True
                            )
                            if not flow:
                                return

                            session = await SessionService.get_or_create_session(
                                tenant_id=tenant_id,
                                contact_phone=contact_phone,
                                flow_id=str(flow.id)
                            )

                            if session.is_human_support:
                                logger.debug(f"👥 Handover ativo para {contact_phone}. Ignorando bot.")
                                return

                            executor = FlowExecutor(flow)
                            await executor.run_step(session, user_input=user_input)

                        except Exception as bg_err:
                            logger.error(f"❌ Erro no Background Task (DB/Bot): {bg_err}")

                    asyncio.create_task(_background_persistence_and_bot())

                except Exception as direct_err:
                    logger.error(f"[Gateway] ❌ Falha crítica no processamento da mensagem: {direct_err}")
            # ── ACK de entrega ─────────────────────────────────────────────
            elif ws_payload.event == WhatsAppMessageEvent.ON_ACK:
                ack_body = ws_payload.payload
                logger.info(
                    f"[Gateway] ✔️ ACK recebido | msg_id='{ack_body.get('id')}' "
                    f"| status={ack_body.get('status')} | tenant='{tenant_id}'"
                )
                await rabbitmq_bus.publish(
                    exchange_name="messages_exchange",
                    routing_key="message.ack",
                    message={
                        "tenant_id": tenant_id,
                        "channel": "whatsapp",
                        "session": ws_payload.session,
                        "ack": ack_body
                    }
                )

            # ── Mudança de estado / QR ─────────────────────────────────────
            elif ws_payload.event == WhatsAppMessageEvent.ON_STATE_CHANGE:
                from src.models.whatsapp_events import WhatsAppSystemEvent
                from src.models.whatsapp import WhatsAppInstance, WhatsAppStatus
                from src.core.ws import ws_manager

                state_body = ws_payload.payload
                state   = state_body.get("state", "UNKNOWN")
                battery = state_body.get("battery")
                qrcode  = state_body.get("qrcode")

                logger.info(
                    f"[Gateway] 🔄 State change | session='{ws_payload.session}' "
                    f"| state='{state}' | tenant='{tenant_id}'"
                )

                # Derivação de Tenant_id extraída globamente no topo do arquivo (Fix 26.241 via Bridge)


                try:
                    new_status = WhatsAppStatus(state.lower())
                except ValueError:
                    logger.warning(
                        f"⚠️ Estado desconhecido do Bridge: '{state}'. "
                        "Usando DISCONNECTED como fallback."
                    )
                    new_status = WhatsAppStatus.DISCONNECTED

                with SessionLocal() as db:
                    # Bloco 1: Atualiza instância (CRÍTICO)
                    try:
                        instance = db.query(WhatsAppInstance).filter(
                            WhatsAppInstance.session_name == ws_payload.session
                        ).execution_options(ignore_tenant=True).first()

                        if instance:
                            instance.status = new_status
                            if qrcode:
                                instance.qrcode_base64 = qrcode
                            db.commit()
                            logger.info(
                                f"✅ Instância '{ws_payload.session}' atualizada: "
                                f"status={new_status.value} | qrcode={'sim' if qrcode else 'não'}"
                            )
                        else:
                            logger.warning(
                                f"⚠️ Instância não encontrada para sessão: '{ws_payload.session}'"
                            )
                    except Exception as e_inst:
                        db.rollback()
                        logger.error(f"❌ Falha ao atualizar instância WhatsApp: {e_inst}")

                    # Bloco 2: Auditoria (NÃO CRÍTICO)
                    try:
                        log_details = state_body.copy()
                        if qrcode and len(qrcode) > 100:
                            log_details["qrcode"] = f"{qrcode[:50]}...[TRUNCATED]"

                        event_log = WhatsAppSystemEvent(
                            tenant_id=tenant_id,
                            session_name=ws_payload.session,
                            event_type=state,
                            details=json.dumps(log_details)
                        )
                        db.add(event_log)
                        db.commit()
                    except Exception as e_log:
                        db.rollback()
                        logger.warning(f"⚠️ Log de auditoria falhou: {e_log}")

                # Notifica UI via WebSocket RPC (Sprint 21 + RPC Consistency)
                socket_payload = {
                    "method": "bot_system_event",
                    "params": {
                        "event": state,
                        "battery": battery,
                        "session": ws_payload.session
                    }
                }

                if state == "QRCODE" and qrcode:
                    logger.info(
                        f"📤 Encaminhando QR Code via WS | tenant='{tenant_id}' "
                        f"| size={len(qrcode)} chars"
                    )
                    socket_payload = {
                        "method": "update_bot_qr",
                        "params": {
                            "qrcode": qrcode.strip(),
                            "session": ws_payload.session
                        }
                    }

                history_data = []
                if state == "CONNECTED":
                    logger.info(f"🔄 Bot '{ws_payload.session}' conectado. Restaurando histórico...")
                    history = await chat_service.get_session_history(tenant_id, ws_payload.session)
                    history_data = [msg.model_dump(mode='json') for msg in history]
                    socket_payload["params"]["history"] = history_data
                    socket_payload["method"] = "chat_history_restored"
                    logger.info(f"📚 Histórico restaurado: {len(history_data)} msg(s)")

                # 🟢 Notificação Real-time imediata via RAM (Bypass RabbitMQ)
                await ws_manager.broadcast_to_tenant(tenant_id, socket_payload)
                logger.debug(
                    f"[Gateway] Estado '{state}' broadcast direto via WS | "
                    f"tenant='{tenant_id}' | history={len(history_data)} msgs"
                )

            return {"success": True, "status": "processed"}

        except Exception as e:
            logger.error(
                f"❌ Erro ao processar webhook WhatsApp | tenant='{tenant_id}' "
                f"| event='{payload.get('event')}' | erro: {e}"
            )
            raise HTTPException(status_code=400, detail=f"Webhook processing error: {str(e)}")

    # 🎯 2. Tratamento Genérico para outros canais
    logger.warning(f"[Gateway] Canal '{channel_type}' não implementado. Payload descartado.")
    return {"success": True, "status": "queued"}
