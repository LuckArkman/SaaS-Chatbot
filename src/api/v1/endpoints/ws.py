"""
Gerenciador de Conexões WebSocket (ConnectionManager)

PRINCÍPIO ARQUITETURAL:
  Gerencia um dicionário global de conexões ativas indexado por Tenancy ID.
  Garante a entrega de mensagens em tempo real (RPC) associando eventos
  do Baileys ao socket correto do Front-End.
"""

from typing import Dict, List
from fastapi import WebSocket
from src.core.redis import redis_client
from loguru import logger


class ConnectionManager:
    """
    Gerencia referências de WebSockets em memória usando um dicionário hierárquico.
    Estrutura: { "TENANCY_ID": { "USER_ID": [WebSocket_Sessao_1, WebSocket_Sessao_2] } }
    """

    def __init__(self):
        # O dicionário principal que mantém as referências vivas
        self.active_connections: Dict[str, Dict[str, List[WebSocket]]] = {}

    def _normalize_id(self, identity: str) -> str:
        """
        Normaliza IDs para evitar falhas de busca por diferença de Case (Upper/Lower)
        ou espaços em branco acidentais.
        """
        return str(identity).strip().upper() if identity else ""

    async def connect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """
        Registra uma nova conexão no dicionário de Tenancy.
        Chamado durante o Handshake inicial do WebSocket.
        """
        await websocket.accept()

        t_id = self._normalize_id(tenant_id)
        u_id = self._normalize_id(user_id)

        if not t_id or not u_id:
            logger.error(f"[WS] Tentativa de conexão com IDs inválidos. Tenant: {tenant_id}, User: {user_id}")
            await websocket.close(code=1008)
            return

        # Inicializa a árvore do dicionário para o Tenant
        if t_id not in self.active_connections:
            self.active_connections[t_id] = {}

        # Inicializa a lista de conexões para o Usuário (suporta múltiplas abas abertas)
        if u_id not in self.active_connections[t_id]:
            self.active_connections[t_id][u_id] = []

        self.active_connections[t_id][u_id].append(websocket)

        # Registro de presença opcional no Redis
        try:
            await redis_client.set(f"presence:{t_id}:{u_id}", "online", expire=3600)
        except Exception as e:
            logger.warning(f"[WS] Falha ao registrar presença no Redis: {e}")

        logger.info(
            f"[WS] 🟢 Conexão registrada no dicionário: Tenant={t_id} | User={u_id} | Sockets={len(self.active_connections[t_id][u_id])}")

    async def disconnect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """
        Remove a referência do WebSocket do dicionário.
        Libera memória e evita tentativas de envio para conexões mortas.
        """
        t_id = self._normalize_id(tenant_id)
        u_id = self._normalize_id(user_id)

        try:
            if t_id in self.active_connections:
                if u_id in self.active_connections[t_id]:
                    # Remove o socket específico da lista
                    if websocket in self.active_connections[t_id][u_id]:
                        self.active_connections[t_id][u_id].remove(websocket)

                    # Se o usuário não tem mais sockets ativos, limpa a chave do usuário
                    if not self.active_connections[t_id][u_id]:
                        del self.active_connections[t_id][u_id]
                        try:
                            await redis_client.delete(f"presence:{t_id}:{u_id}")
                        except:
                            pass

                # Se o Tenant não tem mais nenhum usuário online, limpa a chave do Tenant
                if not self.active_connections[t_id]:
                    del self.active_connections[t_id]

            logger.info(f"[WS] 🔴 Conexão removida do dicionário: Tenant={t_id} | User={u_id}")
        except Exception as e:
            logger.error(f"[WS] Erro ao processar desconexão: {e}")

    async def broadcast_to_tenant(self, tenant_id: str, message: dict) -> int:
        """
        Localiza o Tenancy ID no dicionário e transmite a mensagem para todos os
        agentes conectados daquele cliente.
        """
        t_id = self._normalize_id(tenant_id)

        if t_id not in self.active_connections:
            logger.warning(
                f"[WS] Broadcast falhou: Tenancy ID '{t_id}' não localizado no dicionário de conexões ativas.")
            return 0

        delivered = 0
        stale_connections = []

        # Itera sobre todos os usuários e sockets vinculados ao Tenant no dicionário
        for user_id, sockets in self.active_connections[t_id].items():
            for ws in list(sockets):  # Usa list() para permitir remoção segura durante a iteração
                try:
                    await ws.send_json(message)
                    delivered += 1
                except Exception as e:
                    logger.error(f"[WS] Falha ao enviar para socket do usuário {user_id}: {e}")
                    stale_connections.append((user_id, ws))

        # Limpeza automática de "Zombies" (Sockets que caíram mas não dispararam disconnect)
        for u_id, ws in stale_connections:
            await self.disconnect(t_id, u_id, ws)

        return delivered

    async def send_personal_message(self, tenant_id: str, user_id: str, message: dict):
        """Entrega uma mensagem RPC para um usuário específico (Direct Message)."""
        t_id = self._normalize_id(tenant_id)
        u_id = self._normalize_id(user_id)

        if t_id in self.active_connections and u_id in self.active_connections[t_id]:
            for ws in list(self.active_connections[t_id][u_id]):
                try:
                    await ws.send_json(message)
                except:
                    await self.disconnect(t_id, u_id, ws)

    async def publish_event(self, tenant_id: str, payload: dict, user_id: str = None):
        """
        Interface de alto nível para publicação de eventos do sistema.
        Normaliza o payload para o formato RPC padrão: { method, params }.
        """
        # Se o payload vier com 'type', converte para 'method' (Padrão RPC do Front)
        if "type" in payload and "method" not in payload:
            method_name = payload.pop("type")
            payload = {
                "method": method_name,
                "params": payload
            }

        if user_id:
            await self.send_personal_message(tenant_id, user_id, payload)
        else:
            await self.broadcast_to_tenant(tenant_id, payload)


# Instância Singleton para importação global
ws_manager = ConnectionManager()