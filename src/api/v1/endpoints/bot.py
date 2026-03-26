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
    Busca o QR Code para pareamento.
    Estratégia de dupla fonte:
    1. Primeiro tenta o banco (atualizado pelo webhook do Bridge em tempo real).
    2. Se não houver no banco, consulta o Bridge diretamente.
    3. Se nenhum dos dois tiver, retorna 202 (Aceito/Aguardando) com o status atual.
    """
    from src.services.whatsapp_bridge_service import whatsapp_bridge
    from src.models.whatsapp import WhatsAppStatus

    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)

    # 1. Tenta o DB primeiro (mais rápido, atualizado pelo webhook on_state_change)
    if instance.qrcode_base64:
        logger.debug(f"✅ QR Code servido do banco para {instance.session_name}")
        return {
            "status": instance.status,
            "qrcode": instance.qrcode_base64
        }

    # 2. Fallback: consulta o Bridge diretamente
    qr = await whatsapp_bridge.get_qrcode(instance.session_name)
    if qr:
        # Persiste no banco para as próximas chamadas
        instance.qrcode_base64 = qr
        db.commit()
        logger.debug(f"✅ QR Code obtido do Bridge e cacheado no banco para {instance.session_name}")
        return {
            "status": instance.status,
            "qrcode": qr
        }

    # 3. Ainda não disponível - retorna 202 com status atual para o cliente continuar tentando
    logger.info(f"⏳ QR Code ainda não disponível para {instance.session_name} (status: {instance.status})")
    raise HTTPException(
        status_code=status.HTTP_202_ACCEPTED,
        detail={
            "message": "QR Code ainda não gerado. O bot está inicializando.",
            "status": str(instance.status),
            "retry_after_seconds": 3
        }
    )

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
