from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from src.core.ws import ws_manager
from src.api import deps
from src.core import security
from loguru import logger
import json

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    Endpoint WebSocket seguro. Exige Token JWT via Query Parameter.
    Responsável por manter a bridge de eventos Real-time com o Frontend.
    """
    try:
        # 🛡️ Validação de Segurança (Handshake)
        payload = security.decode_token(token)
        user_id = payload.get("sub")
        # Em produção, poderíamos buscar tenant_id no payload
        tenant_id = payload.get("tenant_id", "DEFAULT_TENANT") 
        
        if not user_id:
            logger.warning("🔒 Tentativa de conexão WebSocket sem UserID no token.")
            await websocket.close(code=1008)
            return

        # Conectar ao gerenciador
        await ws_manager.connect(tenant_id, str(user_id), websocket)
        
        # Loop de recepção (Mantém a conexão viva e responde heartbeats)
        while True:
            data = await websocket.receive_text()
            # Opcional: Tratar comandos vindos do Frontend (Ping/Pong/JoinGroup)
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        ws_manager.disconnect(tenant_id, str(user_id), websocket)
    except Exception as e:
        logger.error(f"❌ Erro fatal no WebSocket para usuário {user_id}: {e}")
        ws_manager.disconnect(tenant_id, str(user_id), websocket)
        await websocket.close(code=1011)
