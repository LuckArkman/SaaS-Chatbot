from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from src import schemas
from src.schemas.whatsapp import WhatsAppPayload, WhatsAppMessageEvent, WhatsAppAckStatus
from src.services.message_normalizer import MessageNormalizer
from src.core.bus import rabbitmq_bus
from src.core.tenancy import get_current_tenant_id
from loguru import logger
import json

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
                
                # --- 🟢 Lead Attribution & Conversion (Sprint 39) ---
                if ws_payload.event == WhatsAppMessageEvent.ON_MESSAGE:
                    from src.models.contact import Contact
                    from src.models.campaign import Campaign
                    with SessionLocal() as db:
                        lead = db.query(Contact).filter(
                            Contact.tenant_id == tenant_id,
                            Contact.phone_number == unified_msg.from_id
                        ).first()
                        if lead and lead.last_campaign_id:
                            campaign = db.query(Campaign).get(lead.last_campaign_id)
                            if campaign:
                                campaign.replied_count += 1
                                lead.last_campaign_id = None # Marcou como respondido, limpa pra próxima
                                db.commit()

                # --- 🟢 Controle de Quotas (Sprint 33) ---
                from src.services.quota_service import QuotaService
                from src.core.database import SessionLocal
                with SessionLocal() as db:
                    if not await QuotaService.increment_message_usage(db, tenant_id):
                        logger.warning(f"⚠️ Mensagem de {tenant_id} descartada por falta de saldo/quota.")
                        return {"success": False, "status": "quota_exceeded"}

                # Publicar para o Barramento de Eventos Unificado
                await rabbitmq_bus.publish(
                    exchange_name="messages_exchange",
                    routing_key="message.incoming",
                    message={
                        "session": ws_payload.session,
                        "data": unified_msg.model_dump(mode='json') # Pydantic v2 dump
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
                from src.core.database import SessionLocal
                from src.core.ws import ws_manager
                
                state_body = ws_payload.payload # Ex: {"state": "CONNECTED", "battery": 80}
                state = state_body.get("state", "UNKNOWN")
                battery = state_body.get("battery")
                
                with SessionLocal() as db:
                    event_log = WhatsAppSystemEvent(
                        tenant_id=tenant_id,
                        session_name=ws_payload.session,
                        event_type=state,
                        details=json.dumps(state_body)
                    )
                    db.add(event_log)
                    db.commit()
                
                # Notifica UI via WebSocket (Broadcaster Sprint 21)
                await ws_manager.broadcast_to_tenant(tenant_id, {
                    "type": "bot_system_event",
                    "event": state,
                    "battery": battery,
                    "session": ws_payload.session
                })
                logger.info(f"🦾 Bot {ws_payload.session} reportou estado: {state} (Bateria: {battery}%)")

            return {"success": True, "status": "processed"}

        except Exception as e:
            logger.error(f"❌ Erro ao processar webhook WhatsApp: {e}")
            raise HTTPException(status_code=400, detail="Invalid WhatsApp payload structure")

    # 🎯 2. Tratamento Genérico para outros canais (Sprint 11)
    # TODO: Implementar conforme novos canais (Telegram, etc) forem adicionados
    
    return {"success": True, "status": "queued"}
