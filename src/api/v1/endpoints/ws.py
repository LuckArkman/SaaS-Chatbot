from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from src.core.ws import ws_manager
from src.core import security
from src.core.database import SessionLocal
from src.services.chat_service import ChatService
from loguru import logger
import json

# Define o router que o api.py está procurando
router = APIRouter()

@router.get("/", tags=["RPC-WebSocket"])
async def websocket_docs():
    """Documentação simplificada da interface RPC."""
    return {"detail": "Conecte-se via protocolo WebSocket em /api/v1/ws/ws"}

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    Endpoint WebSocket seguro. 
    Mantém a conexão viva e processa comandos RPC vindos do Front-end.
    """
    user_id = None
    tenant_id = None
    
    try:
        # 1. Validação de Segurança
        payload = security.decode_token(token)
        user_id = str(payload.get("sub"))
        tenant_id = str(payload.get("tenant_id"))

        if not user_id or not tenant_id:
            logger.warning("🔒 Conexão recusada: Token inválido ou sem Tenancy ID.")
            await websocket.close(code=1008)
            return

        # 2. Registro no Dicionário Global (Core WS)
        await ws_manager.connect(tenant_id, user_id, websocket)
        
        # 3. Loop de Escuta (Comandos vindos do Agente/Front-end)
        while True:
            raw_data = await websocket.receive_text()
            
            try:
                data = json.loads(raw_data)
                
                # Processamento de Chamadas RPC
                if isinstance(data, dict) and "method" in data:
                    method = data.get("method")
                    params = data.get("params", {})
                    rpc_id = data.get("id")
                    
                    result = None
                    error = None
                    
                    if method == "ping":
                        result = "pong"
                    
                    elif method == "send_message":
                        # Encaminha para o ChatService para envio via WhatsApp
                        try:
                            with SessionLocal() as db:
                                await ChatService.send_agent_message(
                                    db=db,
                                    tenant_id=tenant_id,
                                    agent_id=user_id,
                                    payload=params
                                )
                                result = {"success": True, "status": "sent"}
                        except Exception as e:
                            error = str(e)

                    elif method == "set_typing":
                        conv_id = params.get("conversation_id")
                        is_typing = params.get("is_typing", False)
                        await ChatService.set_typing_status(tenant_id, conv_id, is_typing)
                        result = {"success": True}

                    # Envia Resposta do RPC se houver ID
                    if rpc_id:
                        await websocket.send_json({
                            "type": "rpc_response",
                            "id": rpc_id,
                            "result": result,
                            "error": error
                        })
                
                elif raw_data == "ping":
                    await websocket.send_text("pong")

            except json.JSONDecodeError:
                if raw_data == "ping":
                    await websocket.send_text("pong")

    except WebSocketDisconnect:
        if tenant_id and user_id:
            await ws_manager.disconnect(tenant_id, user_id, websocket)
            
    except Exception as e:
        logger.error(f"❌ Erro fatal no WebSocket (Tenant: {tenant_id}): {e}")
        if tenant_id and user_id:
            await ws_manager.disconnect(tenant_id, user_id, websocket)
        try:
            await websocket.close(code=1011)
        except:
            pass