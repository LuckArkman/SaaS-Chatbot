"""
Rota de Chamadas de Voz via WhatsApp.

Endpoints:
  POST /calls/start    → Inicia chamada de voz para um número
  POST /calls/reject   → Rejeita uma chamada recebida (via frontend)

O evento de chamada recebida (incoming_call) é notificado ao frontend via
WebSocket diretamente pelo Gateway (gateway.py) ao receber on_incoming_call
do Bridge Node.js — não há polling necessário.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api import deps
from src.core.database import get_db
from src.core.tenancy import get_current_tenant_id
from src.models.whatsapp import WhatsAppStatus
from src.schemas.call import CallCreate, CallReject, CallOut
from src.services.whatsapp_bridge_service import whatsapp_bridge
from src.services.whatsapp_manager_service import WhatsAppManagerService
from loguru import logger

router = APIRouter()


def _get_connected_instance(db: Session, tenant_id: str):
    """Helper: valida e retorna instância CONNECTED, lança 409 se não estiver."""
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
    status_val = instance.status.value if hasattr(instance.status, "value") else str(instance.status)
    if status_val != WhatsAppStatus.CONNECTED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"O agente WhatsApp não está conectado (status: {status_val}). "
                "Conecte o bot antes de usar chamadas."
            ),
        )
    return instance


# ─────────────────────────────────────────────────────────────────────────────
# POST /calls/start — Inicia chamada de voz
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/start",
    response_model=CallOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Iniciar chamada de voz via WhatsApp",
    description=(
        "Solicita ao agente Baileys conectado que inicie uma chamada de voz "
        "para o número informado. O Bridge envia o sinal de 'oferta' (WebRTC offer) "
        "ao destinatário via protocolo WhatsApp. "
        "**Requer bot CONNECTED.**"
    ),
)
async def start_call(
    call_in: CallCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    Fluxo:
    1. Valida que o agente está CONNECTED.
    2. Chama Bridge → POST /instance/makeCall → sock.call(jid, 'voice').
    3. Retorna call_id, status e JID destino para o frontend rastrear a chamada.
    """
    instance = _get_connected_instance(db, tenant_id)

    logger.info(
        f"[Calls][Tenant:{tenant_id}] Agente {current_user.id} solicitou "
        f"chamada para {call_in.phone_number}"
    )

    result = await whatsapp_bridge.initiate_call(
        session_id=instance.session_name,
        phone=call_in.phone_number,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao iniciar chamada via Bridge: {result.get('error', 'Erro desconhecido')}",
        )

    return CallOut(
        success=True,
        status=result.get("status", "calling"),
        call_id=result.get("call_id"),
        to=result.get("to"),
        phone=result.get("phone"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /calls/reject — Rejeita chamada recebida
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/reject",
    response_model=CallOut,
    status_code=status.HTTP_200_OK,
    summary="Rejeitar chamada recebida via WhatsApp",
    description=(
        "Envia o sinal de recusa ao remetente da chamada via Baileys. "
        "O frontend deve chamar este endpoint ao exibir a tela de chamada recebida "
        "(notificação `incoming_call` via WebSocket) e o operador clicar em 'Recusar'. "
        "**Requer bot CONNECTED.**"
    ),
)
async def reject_call(
    payload: CallReject,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    Fluxo:
    1. Valida que o agente está CONNECTED.
    2. Chama Bridge → POST /instance/rejectCall → sock.rejectCall(call_id, callerJid).
    3. Retorna confirmação de recusa.
    """
    instance = _get_connected_instance(db, tenant_id)

    logger.info(
        f"[Calls][Tenant:{tenant_id}] Agente {current_user.id} rejeitou "
        f"chamada {payload.call_id} de {payload.caller_jid}"
    )

    result = await whatsapp_bridge.reject_call(
        session_id=instance.session_name,
        call_id=payload.call_id,
        caller_jid=payload.caller_jid,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao rejeitar chamada via Bridge: {result.get('error', 'Erro desconhecido')}",
        )

    return CallOut(
        success=True,
        status="rejected",
        call_id=payload.call_id,
    )
