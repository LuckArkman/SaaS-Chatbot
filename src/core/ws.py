"""
Gerenciador de Conexões WebSocket (ConnectionManager)

ESTRATÉGIA DE VERIFICAÇÃO DE VITALIDADE — Buffer/Cache Interno:
  A função `_probe_connection()` verifica a vitalidade da conexão em TRÊS
  camadas sem realizar nenhuma operação de I/O (zero overhead de rede):

  Camada 1 — Estado Starlette (WebSocketState):
    Starlette rastreia client_state e application_state em memória.
    Se qualquer um não for CONNECTED, o socket está encerrado.

  Camada 2 — Transport asyncio (uvicorn interno):
    Acessa `transport.is_closing()` via `websocket._send.__self__.transport`.
    O transport asyncio mantém um buffer de escrita e um flag `_closing`
    que é setado imediatamente quando a conexão TCP é encerrada,
    mesmo antes do Python disparar qualquer exceção.

  Camada 3 — Buffer de escrita (write buffer):
    `transport.get_write_buffer_size() == -1` ou o próprio `_conn_lost > 0`
    do asyncio indicam que o canal de escrita foi destruído.

  Fallback: Se não conseguir inspecionar o transport (ASGI genérico),
  assume viva e deixa a exceção do send_json ser o árbitro final.

FLUXO NO broadcast_to_tenant:
  1. Chama _probe_connection() — zero I/O, baseado em flags em memória
  2. Se morta → marca para remoção imediata (sem tentar send_json)
  3. Se viva → tenta send_json → se falhar → também marca para remoção
  4. Remove todos os mortos de uma vez para evitar modificação durante iteração
"""

from typing import Dict, List, Optional, Tuple
from fastapi import WebSocket
from starlette.websockets import WebSocketState
from src.core.redis import redis_client
from loguru import logger


# ─── Verificação de Vitalidade Baseada em Buffer/Estado Interno ──────────────

def _probe_connection(websocket: WebSocket) -> bool:
    """
    Verifica se uma conexão WebSocket está ativa consultando apenas o estado
    interno do socket — sem I/O, sem ping, sem await.

    Retorna:
        True  → conexão aparentemente ativa (prossegue com send)
        False → conexão morta detectada via buffer/estado interno
    """

    # ── Camada 1: Estado Starlette (baseado em mensagens já processadas) ──────
    # Starlette seta client_state = DISCONNECTED ao receber uma mensagem
    # de encerramento do protocolo WebSocket (opcode 0x8 / Close frame).
    # Em desconexões silenciosas (TCP cortado pelo proxy) este estado pode
    # permanecer CONNECTED — por isso as camadas 2 e 3 existem.
    try:
        if websocket.client_state != WebSocketState.CONNECTED:
            logger.debug(
                f"[WS:probe] client_state={websocket.client_state.name} → morta"
            )
            return False

        if websocket.application_state != WebSocketState.CONNECTED:
            logger.debug(
                f"[WS:probe] application_state={websocket.application_state.name} → morta"
            )
            return False
    except Exception:
        return False   # Estado inacessível = assume morta

    # ── Camada 2: Transport asyncio (uvicorn/h11/wsproto interno) ────────────
    # A cadeia de acesso é:
    #   websocket._send          → bound method de WebSocketProtocol (uvicorn)
    #   websocket._send.__self__ → instância de WebSocketProtocol
    #   protocol.transport       → asyncio.Transport (o canal TCP real)
    #   transport.is_closing()   → True se o TCP foi encerrado/está encerrando
    try:
        send_fn  = getattr(websocket, "_send", None)
        protocol = getattr(send_fn, "__self__", None) if send_fn else None
        transport: Optional[object] = getattr(protocol, "transport", None)

        if transport is not None:
            # is_closing() é padrão asyncio — disponível em todos os transports
            if hasattr(transport, "is_closing") and transport.is_closing():
                logger.debug("[WS:probe] transport.is_closing()=True → morta")
                return False

            # ── Camada 3: _closing e _conn_lost (atributos internos asyncio) ──
            # _closing: flag interno setado pelo asyncio ao iniciar encerramento
            # _conn_lost: contador de "connection lost" do protocolo asyncio
            # Ambos indicam que o buffer de escrita já foi destruído.
            if getattr(transport, "_closing", False):
                logger.debug("[WS:probe] transport._closing=True → morta")
                return False

            conn_lost = getattr(transport, "_conn_lost", 0)
            if conn_lost and conn_lost > 0:
                logger.debug(f"[WS:probe] transport._conn_lost={conn_lost} → morta")
                return False

    except Exception as inspect_err:
        # Transport inacessível (ASGI genérico, testes, etc.)
        # Não penaliza — continua e deixa o send_json ser o árbitro
        logger.debug(f"[WS:probe] Transport inacessível (fallback ao send): {inspect_err}")

    return True   # Todas as camadas passaram — assume viva


# ─── Remoção de Sockets Mortos do Dicionário ─────────────────────────────────

async def _evict_dead_sockets(
    active_connections: Dict[str, Dict[str, List[WebSocket]]],
    tenant_id: str,
    dead_list: List[Tuple[str, WebSocket]],
) -> None:
    """
    Remove sockets mortos do dicionário de conexões ativas.
    Chamado após o loop de envio para evitar modificação durante iteração.
    """
    for user_id, dead_ws in dead_list:
        try:
            users = active_connections.get(tenant_id, {})
            conns = users.get(user_id, [])
            if dead_ws in conns:
                conns.remove(dead_ws)
                logger.info(
                    f"[WS] 🧹 Socket morto removido do dicionário | "
                    f"tenant='{tenant_id}' | user='{user_id}'"
                )
            if not conns:
                users.pop(user_id, None)
                try:
                    await redis_client.delete(f"presence:{tenant_id}:{user_id}")
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"[WS] Erro ao remover socket morto: {e}")

    # Remove tenant do dicionário se não houver mais usuários
    if tenant_id in active_connections and not active_connections[tenant_id]:
        active_connections.pop(tenant_id, None)


# ─── ConnectionManager ────────────────────────────────────────────────────────

class ConnectionManager:
    """
    Gerencia conexões WebSocket ativas agrupadas por Tenant e Usuário.
    Equivalente ao Hub do SignalR no .NET.

    Estrutura interna:
        active_connections: {
            "TENANT_A": {
                "user_1": [WebSocket, WebSocket],   # múltiplas abas
                "user_2": [WebSocket],
            },
            "TENANT_B": { ... }
        }
    """

    def __init__(self):
        self.active_connections: Dict[str, Dict[str, List[WebSocket]]] = {}

    async def connect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """Aceita a conexão e registra no dicionário de conexões ativas."""
        await websocket.accept()
        tenant_id = tenant_id.upper()

        self.active_connections.setdefault(tenant_id, {})
        self.active_connections[tenant_id].setdefault(user_id, [])
        self.active_connections[tenant_id][user_id].append(websocket)

        try:
            await redis_client.set(f"presence:{tenant_id}:{user_id}", "online", expire=3600)
        except Exception as e:
            logger.warning(f"[WS] Redis presença indisponível (conexão mantida): {e}")

        logger.info(
            f"[WS] 🔌 Conectado | tenant='{tenant_id}' | user='{user_id}' "
            f"| sockets_neste_tenant={sum(len(v) for v in self.active_connections[tenant_id].values())}"
        )

    async def disconnect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """
        Remove a conexão encerrada do dicionário.
        Chamado pelo bloco `finally` do endpoint WebSocket.
        """
        tenant_id = tenant_id.upper()
        try:
            users = self.active_connections.get(tenant_id, {})
            conns = users.get(user_id, [])
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                users.pop(user_id, None)
                try:
                    await redis_client.delete(f"presence:{tenant_id}:{user_id}")
                except Exception:
                    pass
            if not self.active_connections.get(tenant_id):
                self.active_connections.pop(tenant_id, None)
        except Exception as e:
            logger.warning(f"[WS] Erro ao remover conexão: {e}")

        logger.info(f"[WS] 🔌 Desconectado | tenant='{tenant_id}' | user='{user_id}'")

    async def send_personal_message(self, tenant_id: str, user_id: str, message: dict):
        """Envia mensagem para todas as sessões abertas de um usuário específico."""
        tenant_id = tenant_id.upper()
        conns = self.active_connections.get(tenant_id, {}).get(user_id, [])
        dead: List[Tuple[str, WebSocket]] = []

        for ws in list(conns):
            if not _probe_connection(ws):
                dead.append((user_id, ws))
                continue
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"[WS] Falha ao enviar mensagem pessoal: {e}")
                dead.append((user_id, ws))

        if dead:
            await _evict_dead_sockets(self.active_connections, tenant_id, dead)

    async def send_to_conversation(self, tenant_id: str, conversation_id: str, message: dict):
        """Broadcast de um evento de conversa específica para todos os agentes do Tenant."""
        await self.broadcast_to_tenant(tenant_id, {
            "type": message.get("type", "conversation_update"),
            "conversation_id": conversation_id,
            "data": message,
        })

    async def publish_event(self, tenant_id: str, payload: dict, user_id: str = None):
        """
        Publica um evento para o tenant. Roteado em memória — sem RabbitMQ.
        Normaliza payloads legados que usam `type` em vez de `method`.
        """
        tenant_id = tenant_id.upper()

        if "type" in payload and "method" not in payload:
            evt_type = payload.pop("type")
            if evt_type == "bot_status_update":
                payload = {
                    "method": "bot_system_event",
                    "params": {
                        "event": payload.get("status", "DISCONNECTED"),
                        "battery": "100%",
                        "session": payload.get("session", ""),
                    },
                }
            elif evt_type == "bot_qrcode_update":
                payload = {
                    "method": "update_bot_qr",
                    "params": {
                        "qrcode": payload.get("qrcode", ""),
                        "session": payload.get("session", ""),
                    },
                }
            else:
                payload = {"method": evt_type, "params": payload}

        if user_id:
            await self.send_personal_message(tenant_id, user_id, payload)
        else:
            await self.broadcast_to_tenant(tenant_id, payload)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict) -> int:
        """
        Envia mensagem para todos os usuários online de um Tenant.

        Fluxo de verificação por socket:
          1. _probe_connection() — inspeciona buffer/estado interno sem I/O
             → morta detectada via estado: remove imediatamente, sem send
          2. send_json() — tentativa de envio real
             → falha de I/O: marca para remoção pós-loop
          3. _evict_dead_sockets() — limpeza atômica pós-loop

        Retorna o número de conexões que receberam a mensagem com sucesso.
        """
        tenant_id = tenant_id.upper()

        if tenant_id not in self.active_connections:
            logger.warning(
                f"[WS] Nenhuma conexão ativa para tenant='{tenant_id}'. "
                f"Tenants em memória: {list(self.active_connections.keys())}"
            )
            return 0

        delivered = 0
        dead: List[Tuple[str, WebSocket]] = []

        for user_id, connections in self.active_connections.get(tenant_id, {}).items():
            for ws in list(connections):

                # ── Passo 1: Inspeção do buffer/estado interno (sem I/O) ────
                if not _probe_connection(ws):
                    logger.debug(
                        f"[WS] Socket morto detectado via buffer interno | "
                        f"tenant='{tenant_id}' | user='{user_id}' → skip send"
                    )
                    dead.append((user_id, ws))
                    continue

                # ── Passo 2: Tentativa de envio real ────────────────────────
                try:
                    await ws.send_json(message)
                    delivered += 1
                except Exception as e:
                    logger.warning(
                        f"[WS] ☠️  send_json falhou | tenant='{tenant_id}' | "
                        f"user='{user_id}' | {type(e).__name__}: {e}"
                    )
                    dead.append((user_id, ws))

        # ── Passo 3: Remoção atômica dos sockets mortos ────────────────────
        if dead:
            await _evict_dead_sockets(self.active_connections, tenant_id, dead)

        logger.debug(
            f"[WS] broadcast | tenant='{tenant_id}' | "
            f"entregues={delivered} | mortos_removidos={len(dead)}"
        )
        return delivered

    def get_connection_info(self, tenant_id: str) -> dict:
        """
        Retorna diagnóstico da conexão para um Tenant, incluindo estado
        do buffer interno de cada socket. Útil para endpoints de health-check.
        """
        tenant_id = tenant_id.upper()
        users = self.active_connections.get(tenant_id, {})
        result = {}
        for uid, conns in users.items():
            result[uid] = []
            for ws in conns:
                alive = _probe_connection(ws)
                try:
                    client_state = ws.client_state.name
                    app_state    = ws.application_state.name
                except Exception:
                    client_state = app_state = "UNKNOWN"

                # Tenta ler o estado do transport
                transport_closing = None
                try:
                    send_fn  = getattr(ws, "_send", None)
                    protocol = getattr(send_fn, "__self__", None)
                    transport = getattr(protocol, "transport", None)
                    if transport:
                        transport_closing = transport.is_closing()
                except Exception:
                    pass

                result[uid].append({
                    "alive":             alive,
                    "client_state":      client_state,
                    "app_state":         app_state,
                    "transport_closing": transport_closing,
                })
        return result


ws_manager = ConnectionManager()
