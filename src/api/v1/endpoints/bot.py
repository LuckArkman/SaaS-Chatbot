from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
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
    current_user: Any = Depends(deps.get_current_active_user),
    accept: str = Header(None)
) -> Any:
    """
    Retorna o QR Code para pareamento.
    
    Se o header 'Accept' contiver 'text/event-stream', abre um stream SSE que
    entrega cada novo QR Code diretamente do Bridge Node.js (Baileys), sem depender
    do banco de dados. Isso garante que o QR entregue ao usuário é sempre o mais
    recente — o Baileys rotaciona o QR a cada ~18s e qualquer QR mais antigo já
    estará expirado e irrecognível pelo app WhatsApp.
    
    Caso contrário, retorna o estado + QR mais recente em JSON (para clientes legados).
    """
    import asyncio
    import json
    from fastapi.responses import StreamingResponse
    from src.services.whatsapp_bridge_service import whatsapp_bridge

    # Resolve a instância do Tenant (apenas para obter o session_name)
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
    session_name = instance.session_name

    # ── Resposta JSON única (fallback para clientes sem suporte a SSE) ──────
    if not accept or "text/event-stream" not in accept:
        status_live = await whatsapp_bridge.fetch_status(session_name)
        status_str  = status_live.value if hasattr(status_live, "value") else str(status_live)

        qrcode = None
        if status_str == "QRCODE":
            # Consulta o Bridge diretamente — garante QR fresco, não o do banco
            qrcode = await whatsapp_bridge.get_qrcode(session_name)

        return {
            "status": status_str,
            "qrcode": qrcode,
            "session": session_name
        }

    # ── Streaming SSE — entrega cada rotação do QR em tempo real ────────────
    async def event_generator():
        """
        Polling de 3s direto no Bridge Node.js.
        
        Por que consultar o Bridge e não o banco?
        O Baileys mantém `latestQr` em memória e gera um novo QR a cada ~18s.
        O banco só é atualizado quando o webhook chega (pode ter lag de rede).
        Lendo do Bridge diretamente, nunca entregamos um QR velho que o WhatsApp
        vai rejeitar silenciosamente ("QR já foi escaneado" / não reconhece).
        """
        last_qr    = None
        ticks_sent = 0
        max_ticks  = 120  # 120 × 3s = 6 minutos de limite máximo do stream

        while ticks_sent < max_ticks:
            try:
                # 1. Verifica status atual diretamente no Bridge
                live_status = await whatsapp_bridge.fetch_status(session_name)
                status_str  = live_status.value if hasattr(live_status, "value") else str(live_status)

                # 2. Bot já conectado → encerra SSE com sucesso
                if status_str == "CONNECTED":
                    yield f"data: {json.dumps({'status': 'CONNECTED', 'qrcode': None})}\n\n"
                    return

                # Worker ainda inicializando (Bridge retornou 404 → CONNECTING)
                # Notifica o frontend e continua aguardando o QR aparecer
                if status_str == "CONNECTING":
                    yield f"data: {json.dumps({'status': 'CONNECTING', 'qrcode': None})}\n\n"
                    ticks_sent += 1
                    await asyncio.sleep(3)
                    continue

                # DISCONNECTED definitivo — só encerra depois de várias tentativas
                # para não fechar prematuramente no boot
                if status_str == "DISCONNECTED" and ticks_sent > 5:
                    yield f"data: {json.dumps({'status': 'DISCONNECTED', 'qrcode': None})}\n\n"
                    return

                # 3. Busca QR fresco diretamente do Bridge (sem cache de banco)
                current_qr = None
                if status_str == "QRCODE":
                    current_qr = await whatsapp_bridge.get_qrcode(session_name)

                # 4. Só envia se o QR mudou (evita re-entregar o mesmo QR)
                if current_qr and current_qr != last_qr:
                    last_qr = current_qr
                    yield f"data: {json.dumps({'status': status_str, 'qrcode': current_qr})}\n\n"
                    logger.debug(
                        f"[QR-SSE] Novo QR entregue via SSE | "
                        f"tenant='{tenant_id}' | session='{session_name}' | tick={ticks_sent}"
                    )

            except Exception as e:
                logger.warning(f"[QR-SSE] Erro ao consultar Bridge: {e}")
                yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"

            ticks_sent += 1
            await asyncio.sleep(3)

        # Timeout do stream — front-end deve reabrir a conexão SSE se necessário
        yield f"data: {json.dumps({'status': 'timeout', 'qrcode': None})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"   # Essencial: desativa buffering do Nginx para SSE
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
