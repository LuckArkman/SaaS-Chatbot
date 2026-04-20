"""
Gerenciador de Conexões WebSocket (ConnectionManager)

PRINCÍPIO ARQUITETURAL CENTRAL:
  O ciclo de vida de cada conexão WebSocket é controlado EXCLUSIVAMENTE
  pelo endpoint WebSocket em `api/v1/endpoints/ws.py`, via WebSocketDisconnect.

  A função `broadcast_to_tenant` NUNCA remove nem fecha conexões,
  mesmo em caso de falha de envio. Falhas de send_json são transitórias —
  a conexão pode estar momentaneamente indisponível, mas ainda viva.
  Remover a conexão aqui causaria desconexão silenciosa do frontend
  durante uma sessão de chat ativa, o que é uma falha crítica de RPC.
"""

from typing import Dict, List
from fastapi import WebSocket
from src.core.redis import redis_client
from loguru import logger


class ConnectionManager:
    """
    Gerencia conexões WebSocket ativas agrupadas por Tenant e Usuário.
    Equivale ao Hub do SignalR no .NET.
    """

    def __init__(self):
        # Dict[tenant_id, Dict[user_id, List[WebSocket]]]
        self.active_connections: Dict[str, Dict[str, List[WebSocket]]] = {}

    async def connect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """Aceita a conexão e registra no mapa de conexões ativas."""
        await websocket.accept()
        tenant_id = tenant_id.upper()

        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = {}

        if user_id not in self.active_connections[tenant_id]:
            self.active_connections[tenant_id][user_id] = []

        self.active_connections[tenant_id][user_id].append(websocket)

        # Registra presença no Redis (best-effort — falha não deve matar o WebSocket)
        try:
            await redis_client.set(f"presence:{tenant_id}:{user_id}", "online", expire=3600)
        except Exception as redis_err:
            logger.warning(f"[WS] Redis presença indisponível (conexão mantida): {redis_err}")

        logger.info(f"[WS] 🔌 Conectado | tenant='{tenant_id}' | user='{user_id}' "
                    f"| sockets_ativos={len(self.active_connections[tenant_id][user_id])}")

    async def disconnect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """
        Remove a conexão encerrada do mapa de conexões ativas.
        Deve ser chamado EXCLUSIVAMENTE pelo handler `WebSocketDisconnect` do endpoint.
        """
        tenant_id = tenant_id.upper()
        try:
            if tenant_id in self.active_connections:
                if user_id in self.active_connections[tenant_id]:
                    connections = self.active_connections[tenant_id][user_id]
                    if websocket in connections:
                        connections.remove(websocket)

                    # Remove a entrada do usuário se não tiver mais sockets
                    if not connections:
                        del self.active_connections[tenant_id][user_id]
                        try:
                            await redis_client.delete(f"presence:{tenant_id}:{user_id}")
                        except Exception as redis_err:
                            logger.warning(f"[WS] Redis presence delete falhou (ignorado): {redis_err}")

                    # Remove a entrada do tenant se não tiver mais usuários
                    if not self.active_connections[tenant_id]:
                        del self.active_connections[tenant_id]
        except Exception as e:
            logger.warning(f"[WS] Erro ao remover conexão do mapa: {e}")

        logger.info(f"[WS] 🔌 Desconectado | tenant='{tenant_id}' | user='{user_id}'")

    async def send_personal_message(self, tenant_id: str, user_id: str, message: dict):
        """Envia mensagem para todas as sessões abertas de um usuário específico."""
        tenant_id = tenant_id.upper()
        if tenant_id not in self.active_connections:
            return
        if user_id not in self.active_connections[tenant_id]:
            return

        for connection in list(self.active_connections[tenant_id][user_id]):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"[WS] Falha ao enviar mensagem pessoal para user='{user_id}': {e}")

    async def send_to_conversation(self, tenant_id: str, conversation_id: str, message: dict):
        """Broadcast de um evento de conversa específica para todos os agentes do Tenant."""
        await self.broadcast_to_tenant(tenant_id, {
            "type": message.get("type", "conversation_update"),
            "conversation_id": conversation_id,
            "data": message,
        })

    async def publish_event(self, tenant_id: str, payload: dict, user_id: str = None):
        """
        Publica um evento para o tenant. Roteado para chamadas em memória via broadcast_to_tenant.
        (O RabbitMQ foi removido e a função substitui o pass por uma entrega local direta).
        """
        tenant_id = tenant_id.upper()
        if user_id:
            await self.send_personal_message(tenant_id, user_id, payload)
        else:
            await self.broadcast_to_tenant(tenant_id, payload)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict) -> int:
        """
        Envia mensagem para todos os usuários online de um Tenant neste processo.
        Retorna o número de conexões que receberam a mensagem com sucesso.
        """
        tenant_id = tenant_id.upper()
        if tenant_id not in self.active_connections:
            # Fallback debug
            connected_tenants = list(self.active_connections.keys())
            logger.warning(f"[WS] Nenhuma conexão ativa para tenant='{tenant_id}'. Tenants conectados em memória: {connected_tenants}")
            return 0

        delivered = 0
        failed = 0

        for user_id, connections in self.active_connections.get(tenant_id, {}).items():
            for connection in list(connections):  # list() para snapshot seguro — sem modificar durante o loop
                try:
                    await connection.send_json(message)
                    delivered += 1
                except Exception as e:
                    failed += 1
                    logger.warning(
                        f"[WS] Falha transitória ao enviar RPC | tenant='{tenant_id}' user='{user_id}' "
                        f"| A conexão permanece ativa. Erro: {e}"
                    )
                    # ← Nenhuma remoção aqui. O endpoint limpará via WebSocketDisconnect.

        logger.debug(
            f"[WS] broadcast_to_tenant concluído | tenant='{tenant_id}' "
            f"| entregues={delivered} | falhas_transitórias={failed}"
        )
        return delivered


ws_manager = ConnectionManager()
