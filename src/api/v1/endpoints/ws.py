"""
Endpoint WebSocket com Heartbeat (Ping/Pong) e Limpeza de Conexões Zumbi.

PROBLEMA RESOLVIDO:
  Proxies reversos (Nginx, CDN, firewalls) cortam conexões TCP silenciosamente
  após ~60s de inatividade. O servidor mantinha objetos WebSocket "zumbi" no
  dicionário que pareciam válidos mas lançavam exceção silenciosa no send().

SOLUÇÃO — Três camadas de proteção:
  1. Heartbeat Task: coroutine paralela que envia "ping" a cada PING_INTERVAL
     e aguarda "pong". Se não chegar, marca o socket como morto e encerra.
  2. Semáforo de Pong: `asyncio.Event()` por conexão — evita race conditions
     entre a task de heartbeat e o loop de receive.
  3. Remoção Imediata: quando send_json() falha N vezes consecutivas no
     broadcast, a conexão é removida do dicionário em vez de ser preservada.
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from src.core.ws import ws_manager
from src.core import security
from src.core.database import SessionLocal
from src.services.chat_service import ChatService
from loguru import logger

router = APIRouter()

# ─── Constantes de Heartbeat ────────────────────────────────────────────────
PING_INTERVAL   = 25   # Intervalo entre pings (segundos) — abaixo do timeout padrão do Nginx (60s)
PONG_TIMEOUT    = 12   # Tempo máximo de espera pelo pong após enviar ping
RPC_RECV_TIMEOUT = 5   # Timeout de receive_text (retorna ao heartbeat a cada X segundos)


@router.get("/", tags=["RPC-WebSocket"])
async def websocket_docs():
    """Documentação simplificada da interface RPC via WebSocket."""
    return {"detail": "Conecte-se via WebSocket em /api/v1/ws/ws?token=<JWT>"}


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Endpoint WebSocket seguro com Heartbeat e limpeza de conexões zumbi.

    Protocolo de comunicação:
      ← servidor envia: JSON {"method": "...", "params": {...}}
      ← servidor envia: texto "ping"
      → cliente responde: texto "pong"
      → cliente envia: JSON {"method": "send_message"|"set_typing", "params": {...}, "id": "..."}
    """
    user_id    = None
    tenant_id  = None
    pong_event = asyncio.Event()   # Sinaliza que um pong foi recebido

    try:
        # ── 1. Autenticação via JWT ─────────────────────────────────────────
        payload = security.decode_token(token)
        user_id   = str(payload.get("sub"))
        tenant_id = str(payload.get("tenant_id"))

        if not user_id or not tenant_id or user_id == "None" or tenant_id == "None":
            logger.warning("[WS] Conexão recusada: token sem user_id ou tenant_id.")
            await websocket.close(code=1008)
            return

        # ── 2. Registra no ConnectionManager ──────────────────────────────
        await ws_manager.connect(tenant_id, user_id, websocket)
        logger.info(f"[WS] ✅ Conectado | tenant={tenant_id} | user={user_id}")

        # ── 3. Task paralela de Heartbeat ──────────────────────────────────
        async def heartbeat_task():
            """
            Envia 'ping' periodicamente. Se o pong não chegar em PONG_TIMEOUT
            segundos, considera a conexão morta e a fecha à força.
            """
            while True:
                await asyncio.sleep(PING_INTERVAL)
                try:
                    pong_event.clear()
                    await websocket.send_text("ping")
                    logger.debug(f"[WS] 💓 Ping enviado | tenant={tenant_id} | user={user_id}")

                    # Aguarda pong com timeout
                    got_pong = await asyncio.wait_for(
                        pong_event.wait(),
                        timeout=PONG_TIMEOUT
                    )
                    logger.debug(f"[WS] 💓 Pong recebido | tenant={tenant_id} | user={user_id}")

                except asyncio.TimeoutError:
                    logger.warning(
                        f"[WS] ☠️  Conexão zumbi detectada (sem pong em {PONG_TIMEOUT}s) "
                        f"| tenant={tenant_id} | user={user_id}. Encerrando."
                    )
                    # Fecha forçado — dispara WebSocketDisconnect no loop principal
                    try:
                        await websocket.close(code=1001)   # 1001 = Going Away
                    except Exception:
                        pass
                    return   # Encerra a task de heartbeat

                except Exception as e:
                    logger.warning(f"[WS] Heartbeat encerrado por exceção: {e}")
                    return

        # Inicia heartbeat em background, vinculado ao ciclo de vida desta conexão
        hb_task = asyncio.create_task(heartbeat_task())

        # ── 4. Loop principal de recebimento de mensagens ──────────────────
        try:
            while True:
                try:
                    # receive com timeout curto para não bloquear para sempre
                    raw_data = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=RPC_RECV_TIMEOUT
                    )
                except asyncio.TimeoutError:
                    # Sem mensagem do cliente — normal, apenas continua o loop
                    # O heartbeat_task cuidará de verificar a vitalidade da conexão
                    continue

                # ── Protocolo de Pong ──────────────────────────────────────
                if raw_data == "pong":
                    pong_event.set()    # Sinaliza ao heartbeat_task que o cliente está vivo
                    continue

                # ── Protocolo de Ping enviado pelo cliente (compatibilidade) ──
                if raw_data == "ping":
                    await websocket.send_text("pong")
                    continue

                # ── Processamento RPC ──────────────────────────────────────
                try:
                    data = json.loads(raw_data)
                except json.JSONDecodeError:
                    logger.warning(f"[WS] Mensagem inválida (não-JSON): {raw_data[:120]}")
                    continue

                if not isinstance(data, dict) or "method" not in data:
                    continue

                method = data.get("method")
                params = data.get("params", {})
                rpc_id = data.get("id")
                result = None
                error  = None

                # ── Handlers RPC ───────────────────────────────────────────
                if method == "send_message":
                    try:
                        with SessionLocal() as db:
                            await ChatService.send_agent_message(
                                db=db,
                                tenant_id=tenant_id,
                                agent_id=user_id,
                                payload=params,
                            )
                            result = {"success": True, "status": "sent"}
                    except Exception as e:
                        error = str(e)
                        logger.error(f"[WS] Erro em send_message RPC: {e}")

                elif method == "set_typing":
                    conv_id   = params.get("conversation_id")
                    is_typing = params.get("is_typing", False)
                    try:
                        await ChatService.set_typing_status(tenant_id, conv_id, is_typing)
                        result = {"success": True}
                    except Exception as e:
                        error = str(e)

                elif method == "ping":
                    # Ping via RPC JSON (compatibilidade com clientes mais antigos)
                    result = "pong"

                # Resposta RPC (somente se o cliente enviou um ID)
                if rpc_id:
                    try:
                        await websocket.send_json({
                            "type":   "rpc_response",
                            "id":     rpc_id,
                            "result": result,
                            "error":  error,
                        })
                    except Exception as send_err:
                        logger.warning(f"[WS] Falha ao enviar rpc_response (id={rpc_id}): {send_err}")

        finally:
            # Cancela a task de heartbeat ao sair do loop (por qualquer motivo)
            hb_task.cancel()
            try:
                await hb_task
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect as e:
        logger.info(f"[WS] 🔌 Desconexão normal | tenant={tenant_id} | user={user_id} | code={e.code}")

    except Exception as e:
        logger.error(f"[WS] ❌ Erro fatal | tenant={tenant_id} | user={user_id} | {type(e).__name__}: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass

    finally:
        # SEMPRE limpa o dicionário — independente da causa da desconexão
        if tenant_id and user_id:
            await ws_manager.disconnect(tenant_id, user_id, websocket)
            logger.info(f"[WS] 🧹 Conexão removida do mapa | tenant={tenant_id} | user={user_id}")