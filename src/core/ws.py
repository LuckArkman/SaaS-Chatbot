from src.core.redis import redis_client
from loguru import logger

class ConnectionManager:
    """
    Gerencia as conexões WebSocket ativas, agrupadas por Tenant e Usuário.
    Replica a lógica de Hubs do SignalR no .NET.
    """
    def __init__(self):
        # Dict[tenant_id, Dict[user_id, List[WebSocket]]]
        self.active_connections: Dict[str, Dict[str, List[WebSocket]]] = {}

    async def connect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """Aceita uma nova conexão e armazena no contexto do Tenant/User."""
        await websocket.accept()
        
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = {}
        
        if user_id not in self.active_connections[tenant_id]:
            self.active_connections[tenant_id][user_id] = []
            
        self.active_connections[tenant_id][user_id].append(websocket)
        
        # 🟢 Registra presença no Redis (Sprint 21)
        await redis_client.set(f"presence:{tenant_id}:{user_id}", "online", expire=3600)
        
        logger.info(f"🔌 Novo WebSocket: Tenant {tenant_id} | User {user_id}")

    async def disconnect(self, tenant_id: str, user_id: str, websocket: WebSocket):
        """Remove uma conexão encerrada."""
        if tenant_id in self.active_connections:
            if user_id in self.active_connections[tenant_id]:
                if websocket in self.active_connections[tenant_id][user_id]:
                    self.active_connections[tenant_id][user_id].remove(websocket)
                    
                if not self.active_connections[tenant_id][user_id]:
                    del self.active_connections[tenant_id][user_id]
                    # 🔴 Remove do Redis se for o último socket do usuário
                    await redis_client.delete(f"presence:{tenant_id}:{user_id}")
        
        logger.info(f"🔌 WebSocket encerrado: Tenant {tenant_id} | User {user_id}")

    async def send_to_conversation(self, tenant_id: str, conversation_id: str, message: dict):
        """
        Envia mensagem para todos os agentes que estão 'ouvindo' uma conversa específica.
        Estratégia de Broadcast por Tenant para manter a UI sincronizada.
        """
        await self.broadcast_to_tenant(tenant_id, {
            "type": "conversation_update",
            "conversation_id": conversation_id,
            "data": message
        })

    async def send_personal_message(self, tenant_id: str, user_id: str, message: dict):
        """Envia mensagem para todas as sessões abertas de um usuário específico."""
        if tenant_id in self.active_connections:
            if user_id in self.active_connections[tenant_id]:
                for connection in self.active_connections[tenant_id][user_id]:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        logger.error(f"❌ Erro ao enviar WS para Usuário {user_id}: {e}")

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        """Envia mensagem para todos os usuários online de um Tenant específico."""
        if tenant_id in self.active_connections:
            for user_id in self.active_connections[tenant_id]:
                for connection in self.active_connections[tenant_id][user_id]:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        logger.error(f"❌ Erro ao enviar WS broadcast para Tenant {tenant_id}: {e}")

ws_manager = ConnectionManager()
