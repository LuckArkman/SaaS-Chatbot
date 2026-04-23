"""
Endpoint WebSocket com Keepalive Server-Side e Limpeza de Conexões Zumbi.

CAUSA RAIZ DO PROBLEMA (resolvida aqui):
  A versão anterior exigia que o frontend respondesse com "pong" a cada "ping".
  Se o frontend não implementasse essa resposta, o heartbeat_task disparava um
  TimeoutError após (PING_INTERVAL + PONG_TIMEOUT) segundos e fechava o socket
  forçosamente — removendo-o do dicionário. Mensagens subsequentes falhavam
  pois o dicionário estava vazio.

NOVA ESTRATÉGIA — Keepalive Unidirecional:
  1. O servidor envia "ping" a cada PING_INTERVAL segundos como keepalive.
     Se send_text("ping") FALHAR → conexão TCP está morta → fecha.
     Se send_text("ping") PASSAR → conexão está viva → continua.
     Nenhuma resposta "pong" é exigida do cliente para manter o socket.

  2. Se o cliente QUISER responder "pong" (boa prática), o loop de receive aceita
     e processa normalmente — não faz nada além de logar.

  3. Zombie removal via broadcast_to_tenant (core/ws.py) garante que sockets
     que falham durante um envio de mensagem real sejam removidos imediatamente.

COMPATIBILIDADE COM FRONTEND:
  O cliente NÃO precisa implementar nenhuma lógica de pong para funcionar.
  Mas se implementar, funciona normalmente (o "pong" é silenciosamente descartado).
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

# ─── Constantes de Keepalive ─────────────────────────────────────────────────
# 25s < 60s (timeout padrão do Nginx proxy_read_timeout)
# Garante que o proxy nunca considera a conexão "inativa"
PING_INTERVAL    = 25   # Intervalo entre pings de keepalive (segundos)
RECV_TIMEOUT     = 5    # Timeout no receive_text — cede controle ao heartbeat regularmente


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
    Endpoint WebSocket seguro com keepalive server-side.

    Protocolo de Mensagens (servidor → cliente):
      ← "ping"                                   (keepalive, texto simples)
      ← {"method": "receive_message", "params":{}} (nova mensagem)
      ← {"method": "incoming_call",   "params":{}} (chamada recebida)
      ← {"method": "message_status_update", ...}   (ACK de entrega)
      ← {"type": "rpc_response", "id":..., ...}    (resposta de chamada RPC)

    Protocolo de Mensagens (cliente → servidor):
      → {"method": "send_message", "params":{...}, "id":"..."} (enviar msg)
      → {"method": "set_typing",   "params":{...}}              (status digitando)
      → "pong"  (OPCIONAL — resposta ao ping, não obrigatória)
    """
    user_id   = None
    tenant_id = None

    try:
        # ── 1. Autenticação via JWT ─────────────────────────────────────────
        payload   = security.decode_token(token)
        user_id   = str(payload.get("sub"))
        tenant_id = str(payload.get("tenant_id"))

        if not user_id or not tenant_id or user_id == "None" or tenant_id == "None":
            logger.warning("[WS] Conexão recusada: token sem user_id ou tenant_id.")
            await websocket.close(code=1008)
            return

        # ── 2. Registra no ConnectionManager ──────────────────────────────
        await ws_manager.connect(tenant_id, user_id, websocket)
        logger.info(f"[WS] ✅ Conectado | tenant={tenant_id} | user={user_id}")

        # ── 3. Task de Keepalive (Server-side Ping) ────────────────────────
        # Envia "ping" periodicamente para evitar que proxies derrubem
        # a conexão por inatividade. Não exige pong do cliente.
        async def keepalive_task():
            while True:
                await asyncio.sleep(PING_INTERVAL)
                try:
                    await websocket.send_text("ping")
                    logger.debug(f"[WS] 💓 Keepalive ping | tenant={tenant_id} | user={user_id}")
                except Exception as e:
                    # Se send_text falhar, a conexão TCP está morta.
                    # Encerrar a task; o socket será removido pelo broadcast_to_tenant
                    # na próxima mensagem que tentar ser entregue.
                    logger.warning(
                        f"[WS] 💔 Keepalive falhou (conexão morta) | "
                        f"tenant={tenant_id} | user={user_id} | {e}"
                    )
                    # Tenta forçar o WebSocketDisconnect no loop principal
                    try:
                        await websocket.close(code=1001)
                    except Exception:
                        pass
                    return  # Encerra a keepalive_task

        hb_task = asyncio.create_task(keepalive_task())

        # ── 4. Loop principal de recebimento ───────────────────────────────
        try:
            while True:
                try:
                    raw_data = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=RECV_TIMEOUT,
                    )
                except asyncio.TimeoutError:
                    # Sem mensagem do cliente neste tick — normal.
                    # O keepalive_task cuida de manter a conexão viva.
                    continue

                # ── Protocolo: pong (resposta opcional ao keepalive) ───────
                if raw_data in ("pong", "ping"):
                    # "ping" do cliente → responde com "pong"
                    if raw_data == "ping":
                        try:
                            await websocket.send_text("pong")
                        except Exception:
                            pass
                    # "pong" do cliente → simplesmente ignora (já funcionamos sem ele)
                    continue

                # ── Protocolo: RPC JSON ────────────────────────────────────
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

                # ── RPC: send_message ──────────────────────────────────────
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

                # ── RPC: set_typing ────────────────────────────────────────
                elif method == "set_typing":
                    try:
                        await ChatService.set_typing_status(
                            tenant_id,
                            params.get("conversation_id"),
                            params.get("is_typing", False),
                        )
                        result = {"success": True}
                    except Exception as e:
                        error = str(e)

                # ── RPC: ping (JSON version) ───────────────────────────────
                elif method == "ping":
                    result = "pong"

                # ── Resposta RPC (somente se cliente enviou um ID) ─────────
                if rpc_id:
                    try:
                        await websocket.send_json({
                            "type":   "rpc_response",
                            "id":     rpc_id,
                            "result": result,
                            "error":  error,
                        })
                    except Exception as send_err:
                        logger.warning(
                            f"[WS] Falha ao enviar rpc_response (id={rpc_id}): {send_err}"
                        )

        finally:
            hb_task.cancel()
            try:
                await hb_task
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect as e:
        logger.info(
            f"[WS] 🔌 Desconexão | tenant={tenant_id} | user={user_id} | code={e.code}"
        )

    except Exception as e:
        logger.error(
            f"[WS] ❌ Erro fatal | tenant={tenant_id} | user={user_id} | "
            f"{type(e).__name__}: {e}"
        )
        try:
            await websocket.close(code=1011)
        except Exception:
            pass

    finally:
        # SEMPRE limpa o dicionário — qualquer causa de encerramento
        if tenant_id and user_id:
            await ws_manager.disconnect(tenant_id, user_id, websocket)
            logger.info(
                f"[WS] 🧹 Referência removida do mapa | tenant={tenant_id} | user={user_id}"
            )