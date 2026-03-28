from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src import schemas
from src.api import deps
from src.services.whatsapp_manager_service import WhatsAppManagerService
from src.core.database import get_db
from src.core.tenancy import get_current_tenant_id
from loguru import logger

router = APIRouter()

@router.get("/", response_model=schemas.whatsapp.WhatsAppInstance)
async def get_bot_status(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Busca o estado do Bot do Tenant."""
    return WhatsAppManagerService.get_or_create_instance(db, tenant_id)

@router.get("/qr")
async def get_bot_qr(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    Retorna o QR Code para pareamento via SSE (Server-Sent Events).
    Atualiza o front-end por meio de streaming sempre que o QR Code mudar.
    """
    import asyncio
    import json
    from fastapi.responses import StreamingResponse
    from src.core.database import SessionLocal

    async def event_generator():
        last_qr = None
        while True:
            # Obtém uma nova sessão do banco a cada iteração (impede lock em conexões)
            with SessionLocal() as db_session:
                instance = WhatsAppManagerService.get_or_create_instance(db_session, tenant_id)
                current_qr = instance.qrcode_base64
                status = instance.status
                status_str = status.value if hasattr(status, "value") else str(status)

                if current_qr != last_qr:
                    last_qr = current_qr
                    # Somente envia se for evento válido de qr
                    data = {
                        "status": status_str,
                        "qrcode": current_qr
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                
                # Se o estado não for de inicialização e não tiver QR ou já tiver pareado, finaliza.
                if status_str in ["CONNECTED", "DISCONNECTED"]:
                    data = {
                        "status": status_str,
                        "qrcode": None
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    break

            await asyncio.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/start")
async def start_bot(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Inicia o processo Node.js do Bot (Sprint 33)."""
    from src.services.billing_service import BillingService
    if not BillingService.check_plan_validity(db, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Seu plano atual não permite instâncias de bot ou está expirado. Por favor, faça um upgrade."
        )

    success = await WhatsAppManagerService.initialize_bot(db, tenant_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY, detail="Erro ao comunicar com o Bridge do WhatsApp (Offline ou Inacessível)")
        
    return {"status": "starting", "success": True}

@router.post("/stop")
async def stop_bot(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Para o processo do Bot no Bridge."""
    success = await WhatsAppManagerService.stop_bot(db, tenant_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha ao parar o bot no Bridge")
    return {"status": "stopped", "success": True}

@router.post("/restart")
async def restart_bot(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Reinicia o processo do Bot no Bridge."""
    success = await WhatsAppManagerService.restart_bot(db, tenant_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha ao reiniciar o bot no Bridge")
    return {"status": "restarting", "success": True}

@router.delete("/logout")
async def logout_bot(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Desloga o WhatsApp e limpa a sessão."""
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
    from src.services.whatsapp_bridge_service import whatsapp_bridge
    
    success = await whatsapp_bridge.logout(instance.session_name)
    if success:
        from src.models.whatsapp import WhatsAppStatus
        instance.status = WhatsAppStatus.DISCONNECTED
        instance.qrcode_base64 = None
        db.commit()
        return {"status": "logged_out"}
        
    return {"error": "Falha ao deslogar no Bridge"}
