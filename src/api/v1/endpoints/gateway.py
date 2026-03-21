from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from src import schemas
from src.schemas.whatsapp import WhatsAppPayload, WhatsAppMessageEvent, WhatsAppAckStatus
from src.services.message_normalizer import MessageNormalizer
from src.core.bus import rabbitmq_bus
from src.core.tenancy import get_current_tenant_id
from src.core.database import SessionLocal
from loguru import logger
import json
from src.services.chat_service import chat_service
from src.models.mongo.chat import MessageSource

router = APIRouter()

# API Key simples para validação de webhooks (Pode ser migrada para DB depois)
GATEWAY_API_KEY = "SaaS_Secret_Gateway_Key_2026"

def verify_gateway_key(x_api_key: str = Header(...)):
    if x_api_key != GATEWAY_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Gateway API Key"
        )
    return x_api_key

@router.post("/webhook/{channel_type}", status_code=status.HTTP_202_ACCEPTED)
async def incoming_webhook(
    channel_type: str,
    payload: dict, # Recebemos como dict para parsing flexível de diferentes canais
    api_key: str = Depends(verify_gateway_key)
) -> Any:
    """
    Endpoint de Webhook especializado para WhatsApp (Venom/Evolution) e outros canais.
    """
    tenant_id = get_current_tenant_id()
    
    # 🎯 1. Tratamento específico para WhatsApp (Sprint 12)
    if channel_type == "whatsapp":
        try:
            ws_payload = WhatsAppPayload(**payload)
            
            # --- Filtragem de Mensagens (Checklist item 2) ---
            # Se for uma mensagem recebida:
            if ws_payload.event == WhatsAppMessageEvent.ON_MESSAGE:
                msg_body = ws_payload.payload
                
                # Ignorar mensagens de sistema ou de grupos (para não sobrecarregar o FlowEngine)
                if msg_body.get("isGroupMsg", False) or msg_body.get("from") == "status@broadcast":
                    logger.debug(f"🔇 Ignorando mensagem de grupo/status: {msg_body.get('id')}")
                    return {"success": True, "status": "ignored"}
                
                # Normalização e Filas (Sprint 13)
                unified_msg = MessageNormalizer.from_whatsapp(tenant_id, msg_body)
                
                # ✅ Publicar para o Barramento de Eventos Unificado (Sprint 13)
                await rabbitmq_bus.publish(
                    exchange_name="messages_exchange",
                    routing_key="message.incoming",
                    message={
                        "tenant_id": tenant_id, # Requerido pelo FlowWorker
                        "session": ws_payload.session,
                        "data": unified_msg.model_dump(mode='json')
                    }
                )
                logger.debug(f"📤 Mensagem Unificada expedida: {unified_msg.message_id} (Tenant: {tenant_id})")

            # --- Tratamento de Status/ACK (Checklist item 3) ---
            elif ws_payload.event == WhatsAppMessageEvent.ON_ACK:
                ack_body = ws_payload.payload
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
                logger.debug(f"✔️ ACK recebido para msg: {ack_body.get('id')} Status: {ack_body.get('status')}")

            # --- 🟢 Tratamento de Eventos de Sistema (Sprint 28) ---
            elif ws_payload.event == WhatsAppMessageEvent.ON_STATE_CHANGE:
                from src.models.whatsapp_events import WhatsAppSystemEvent
                from src.models.whatsapp import WhatsAppInstance
                from src.core.database import SessionLocal
                from src.core.ws import ws_manager
                
                state_body = ws_payload.payload # Ex: {"state": "CONNECTED", "battery": 80}
                state = state_body.get("state", "UNKNOWN")
                battery = state_body.get("battery")
                qrcode = state_body.get("qrcode")
                
                with SessionLocal() as db:
                    # ✅ Atualização Reativa do Estado da Instância (Sprint 28)
                    instance = db.query(WhatsAppInstance).filter(
                        WhatsAppInstance.session_name == ws_payload.session
                    ).first()
                    if instance:
                        instance.status = state
                        if qrcode:
                            instance.qrcode_base64 = qrcode
                        db.commit()

                    event_log = WhatsAppSystemEvent(
                        tenant_id=tenant_id,
                        session_name=ws_payload.session,
                        event_type=state,
                        details=json.dumps(state_body)
                    )
                    db.add(event_log)
                    db.commit()
                
                # Notifica UI via WebSocket (Broadcaster Sprint 21)
                socket_payload = {
                    "type": "bot_system_event",
                    "event": state,
                    "battery": battery,
                    "session": ws_payload.session
                }
                
                if state == "QRCODE" and qrcode:
                    socket_payload["type"] = "bot_qrcode_update"
                    socket_payload["qrcode"] = qrcode
                
                # 🟢 Restauração de Histórico (Sprint 40)
                # Quando conectar, envia o bairo de histórico para o front "refletir"
                history_data = []
                if state == "CONNECTED":
                    logger.info(f"🔄 Bot {ws_payload.session} conectado. Restaurando histórico para o Front-end...")
                    history = await chat_service.get_session_history(tenant_id, ws_payload.session)
                    history_data = [msg.model_dump(mode='json') for msg in history]
                    socket_payload["history"] = history_data
                    socket_payload["type"] = "chat_history_restored"

                await ws_manager.broadcast_to_tenant(tenant_id, socket_payload)
                
                # Log final
                logger.info(f"🦾 Bot {ws_payload.session} reportou estado: {state} (Histórico Restaurado: {len(history_data)} msgs)")

            return {"success": True, "status": "processed"}

        except Exception as e:
            logger.error(f"❌ Erro ao processar webhook WhatsApp: {e}")
            raise HTTPException(status_code=400, detail="Invalid WhatsApp payload structure")

    # 🎯 2. Tratamento Genérico para outros canais (Sprint 11)
    # TODO: Implementar conforme novos canais (Telegram, etc) forem adicionados
    
    return {"success": True, "status": "queued"}
