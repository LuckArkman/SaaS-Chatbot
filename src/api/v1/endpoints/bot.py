from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from src import schemas
from src.api import deps
from src.services.whatsapp_manager_service import WhatsAppManagerService
from src.models.whatsapp import WhatsAppInstance
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
        FIX 0-BYTES TIMEOUT:
        O problema era uma query SQLAlchemy síncrona (SessionLocal) dentro do gerador
        assíncrono. Queries síncronas bloqueiam o thread do event loop — enquanto o
        thread está bloqueado, o Uvicorn não consegue fazer flush dos bytes SSE para
        o cliente. Com timeout de 90s e nenhum yield antes do bloqueio, resultado: 0 bytes.

        Soluções aplicadas:
        1. Yield de heartbeat IMEDIATO antes de qualquer I/O (garante que o stream abre).
        2. Query SQL removida do hot loop — session_name resolvido UMA vez.
        3. Re-check de sessão só acontece quando DISCONNECTED (barato e raro).
        4. Todas as chamadas de rede são via httpx assíncrono (nunca bloqueiam).
        """
        import asyncio
        import json

        last_qr      = None
        current_sess = session_name
        ticks_sent   = 0
        max_ticks    = 120  # 120 × 3s = 6 minutos

        # ── PASSO 0: heartbeat imediato ─────────────────────────────────────
        # CRÍTICO: deve ser o PRIMEIRO yield, antes de qualquer I/O.
        # Isso força o Uvicorn a fazer flush dos headers + este primeiro frame
        # para o cliente, confirmando que o stream está vivo.
        yield f"data: {json.dumps({'status': 'CONNECTING', 'qrcode': None, 'session': current_sess})}\n\n"

        while ticks_sent < max_ticks:
            try:
                # ── 1. Verifica status no Bridge (async puro, não bloqueia) ─
                live_status = await whatsapp_bridge.fetch_status(current_sess)
                status_str  = live_status.value if hasattr(live_status, "value") else str(live_status)

                # ── 2. Bot conectado → fim do stream ─────────────────────────
                if status_str == "connected":
                    yield f"data: {json.dumps({'status': 'CONNECTED', 'qrcode': None})}\n\n"
                    return

                # ── 3. Bot inicializando → notifica e aguarda ─────────────────
                if status_str == "connecting":
                    yield f"data: {json.dumps({'status': 'CONNECTING', 'qrcode': None})}\n\n"
                    ticks_sent += 1
                    await asyncio.sleep(3)
                    continue

                # ── 4. DISCONNECTED → verifica se existe nova sessão no banco ─
                if status_str == "disconnected":
                    if ticks_sent > 3:
                        # DB check barato: só quando desconectado e não no primeiro tick
                        loop = asyncio.get_event_loop()
                        def _db_check():
                            from src.core.database import SessionLocal as _SL
                            with _SL() as _db:
                                inst = _db.query(WhatsAppInstance).filter(
                                    WhatsAppInstance.tenant_id == tenant_id,
                                    WhatsAppInstance.is_active == True
                                ).execution_options(ignore_tenant=True).order_by(
                                    WhatsAppInstance.id.desc()
                                ).first()
                                return inst.session_name if inst else None

                        new_sess = await loop.run_in_executor(None, _db_check)
                        if new_sess and new_sess != current_sess:
                            logger.info(f"[QR-SSE] Nova sessão detectada: '{current_sess}' → '{new_sess}'")
                            current_sess = new_sess
                            last_qr = None
                            yield f"data: {json.dumps({'status': 'CONNECTING', 'qrcode': None, 'session': current_sess})}\n\n"
                            ticks_sent += 1
                            await asyncio.sleep(3)
                            continue

                    if ticks_sent > 10:
                        # Após 30s em DISCONNECTED sem nova sessão → considera encerrado
                        yield f"data: {json.dumps({'status': 'DISCONNECTED', 'qrcode': None})}\n\n"
                        return

                    yield f"data: {json.dumps({'status': 'DISCONNECTED', 'qrcode': None})}\n\n"
                    ticks_sent += 1
                    await asyncio.sleep(3)
                    continue

                # ── 5. Status = QRCODE → busca o QR fresco do Bridge ──────────
                current_qr = None
                if status_str == "qrcode":
                    current_qr = await whatsapp_bridge.get_qrcode(current_sess)

                # ── 6. Envia apenas se o QR mudou (evita redundância) ─────────
                if current_qr and current_qr != last_qr:
                    last_qr = current_qr
                    yield f"data: {json.dumps({'status': 'QRCODE', 'qrcode': current_qr})}\n\n"
                    logger.debug(
                        f"[QR-SSE] QR entregue | tenant='{tenant_id}' | "
                        f"session='{current_sess}' | tick={ticks_sent}"
                    )

            except Exception as e:
                logger.warning(f"[QR-SSE] Erro no tick {ticks_sent}: {e}")
                yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"

            ticks_sent += 1
            await asyncio.sleep(3)

        yield f"data: {json.dumps({'status': 'timeout', 'qrcode': None})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":      "no-cache",
            "X-Accel-Buffering":  "no",   # Desativa buffering do Nginx para SSE
            "Connection":         "keep-alive",
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
