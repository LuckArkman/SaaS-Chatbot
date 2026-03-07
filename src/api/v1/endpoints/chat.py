from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.services.chat_service import ChatService
from src.services.agent_assignment_service import AgentAssignmentService
from src.services.message_history_service import MessageHistoryService
from src.core.ws import ws_manager
from src.schemas.chat import MessageOut
from src.api import deps
from src.core.database import get_db
from src.core.tenancy import get_current_tenant_id
from loguru import logger

router = APIRouter()

@router.post("/send", status_code=status.HTTP_202_ACCEPTED)
async def send_message(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    Agente envia uma mensagem para o cliente (WhatsApp).
    O payload deve conter 'conversation_id' e 'content'.
    """
    await ChatService.send_agent_message(db, tenant_id, str(current_user.id), payload)
    return {"success": True, "status": "sent"}

@router.post("/typing", status_code=status.HTTP_200_OK)
async def update_typing(
    is_typing: bool = Query(...),
    conversation_id: str = Query(...),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Notifica o sistema que o agente está digitando."""
    await ChatService.set_typing_status(tenant_id, conversation_id, is_typing)
    return {"success": True}
    
@router.get("/history/{conversation_id}", response_model=List[MessageOut])
async def list_chat_history(
    conversation_id: str,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Busca o histórico de mensagens de uma conversa específica."""
    return MessageHistoryService.list_history(db, conversation_id, limit, offset)

@router.post("/transfer/{conversation_id}", status_code=status.HTTP_200_OK)
async def transfer_chat_endpoint(
    conversation_id: str,
    target_agent_id: int = Query(...),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Transfere uma conversa para outro agente."""
    conversation = MessageHistoryService.get_or_create_conversation(db, conversation_id)
    success = AgentAssignmentService.transfer_chat(db, conversation, target_agent_id)
    
    if not success:
        return {"error": "Agente alvo não encontrado ou indisponível"}
        
    # 🔔 Notifica Agente Alvo (Real-time)
    await ws_manager.send_personal_message(tenant_id, str(target_agent_id), {
        "type": "chat_transferred",
        "contact_phone": conversation_id,
        "from_agent": current_user.full_name
    })

    return {"success": True}

@router.get("/presence/{user_id}")
async def get_agent_presence(
    user_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Verifica se um agente específico está online."""
    from src.core.redis import redis_client
    status = await redis_client.get(f"presence:{tenant_id}:{user_id}")
    return {"user_id": user_id, "status": status or "offline"}
