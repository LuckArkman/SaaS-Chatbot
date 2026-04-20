from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from src.core.ws import ws_manager
from src.api import deps
from src.core import security
import json
from src.services.chat_service import ChatService
from src.core.database import SessionLocal
from loguru import logger

router = APIRouter()
@router.get("/", tags=["RPC-WebSocket"], summary="Documentação da Interface RPC via WebSocket")
async def websocket_docs():
    """
    ### Interface de Comunicação Real-time (RPC)
    Este endpoint não é uma rota HTTP comum. Ele deve ser acessado via protocolo **WebSocket (ws/wss)**.
    
    **Conectividade:**
    * **URL:** `ws://{host}:{port}/api/v1/ws?token={JWT_TOKEN}`
    
    **Estrutura de Requisição (RPC Request):**
    ```json
    {
      "method": "string",
      "params": "object",
      "id": "string (opcional para notificações)"
    }
    ```
    
    **Métodos Suportados:**
    * `send_message`: { conversation_id, content }
    * `set_typing`: { conversation_id, is_typing: bool }
    * `ping`: Sem parâmetros.
    
    **Estrutura de Resposta (RPC Response):**
    ```json
    {
      "type": "rpc_response",
      "id": "string",
      "result": "any",
      "error": "string"
    }
    ```
    """
    return {"detail": "Conecte-se via protocolo WebSocket para utilizar esta interface RPC."}


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
        tenant_id = payload.get("tenant_id")

        if not user_id:
            logger.warning("🔒 Tentativa de conexão WebSocket sem UserID no token.")
            await websocket.close(code=1008)
            return

        if not tenant_id:
            logger.warning(f"🔒 Tentativa de conexão WebSocket sem tenant_id no token (user={user_id}).")
            await websocket.close(code=1008)
            return

        # Conectar ao gerenciador
        await ws_manager.connect(tenant_id, str(user_id), websocket)

        
        # Loop de recepção (Mantém a conexão viva e responde RPC/Heartbeats)
        while True:
            raw_data = await websocket.receive_text()
            
            try:
                data = json.loads(raw_data)
                
                # ─── Estrutura de RPC ──────────────────────────────────────────
                # O Frontend envia: { "method": "...", "params": {...}, "id": "req_123" }
                # O Backend responde: { "type": "rpc_response", "id": "req_123", "result": ... }
                # ──────────────────────────────────────────────────────────────
                
                if isinstance(data, dict) and "method" in data:
                    method = data.get("method")
                    params = data.get("params", {})
                    rpc_id = data.get("id")
                    
                    logger.debug(f"🔌 RPC Request: {method} (id={rpc_id}) | Tenant {tenant_id}")
                    
                    result = None
                    error = None
                    
                    if method == "ping":
                        result = "pong"
                    
                    elif method == "send_message":
                        # Params esperado: { "conversation_id": "...", "content": "..." }
                        # Nota: o front pode enviar "content" ou "message" — aceitamos ambos.
                        try:
                            conv_id_raw = params.get("conversation_id") or params.get("conversation") or ""
                            msg_content = (
                                params.get("content")
                                or params.get("message")
                                or params.get("text")
                                or ""
                            ).strip()

                            logger.debug(
                                f"🔌 RPC send_message | tenant={tenant_id} "
                                f"| conv_id='{conv_id_raw}' | content='{msg_content[:80]}'"
                            )

                            if not conv_id_raw or not msg_content:
                                error = "Campos 'conversation_id' e 'content' são obrigatórios."
                            else:
                                # Normaliza o params para o formato canônico esperado pelo ChatService
                                canonical_params = {
                                    "conversation_id": conv_id_raw,
                                    "content": msg_content,
                                }
                                with SessionLocal() as db:
                                    await ChatService.send_agent_message(
                                        db=db,
                                        tenant_id=tenant_id,
                                        agent_id=str(user_id),
                                        payload=canonical_params
                                    )
                                    result = {"success": True, "status": "queued"}
                        except Exception as e:
                            logger.error(f"❌ Erro no RPC send_message: {e}")
                            error = str(e)


                    elif method == "set_typing":
                        # Params esperado: { "conversation_id": "...", "is_typing": bool }
                        try:
                            conv_id = params.get("conversation_id")
                            is_typing = params.get("is_typing", False)
                            await ChatService.set_typing_status(tenant_id, conv_id, is_typing)
                            result = {"success": True}
                        except Exception as e:
                            logger.error(f"❌ Erro no RPC set_typing: {e}")
                            error = str(e)
                    
                    # ─── Resposta de RPC ─────────
                    if rpc_id:
                        response = {
                            "type": "rpc_response",
                            "id": rpc_id,
                            "result": result,
                            "error": error
                        }
                        await websocket.send_json(response)
                
                elif raw_data == "ping":
                    await websocket.send_text("pong")
                    
            except json.JSONDecodeError:
                # Trata strings puras se não for JSON
                if raw_data == "ping":
                    await websocket.send_text("pong")
                else:
                    logger.warning(f"⚠️ Mensagem WebSocket inválida (não JSON): {raw_data}")
                    
    except WebSocketDisconnect:
        await ws_manager.disconnect(tenant_id, str(user_id), websocket)
    except Exception as e:
        logger.error(f"❌ Erro fatal no WebSocket para usuário {user_id}: {e}")
        await ws_manager.disconnect(tenant_id, str(user_id), websocket)
        try:
            await websocket.close(code=1011)
        except:
            pass
