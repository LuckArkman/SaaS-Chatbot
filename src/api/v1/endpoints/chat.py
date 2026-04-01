from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from src.services.chat_service import ChatService
from src.services.agent_assignment_service import AgentAssignmentService
from src.services.message_history_service import MessageHistoryService
from src.core.ws import ws_manager
from src.schemas.chat import (
    MessageOut, ConversationListResponse, ConversationDetailResponse
)
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
    try:
        await ChatService.send_agent_message(db, tenant_id, str(current_user.id), payload)
        return {"success": True, "status": "sent"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

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


# ─────────────────────────────────────────────────────────────────────────────
# 📱 ROTAS DE CONVERSAS: Diretamente do Agente WhatsApp (Baileys Bridge)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(
    limit: int = Query(50, ge=1, le=200, description="Número máximo de conversas."),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    📱 **Lista todas as conversas abertas diretamente do WhatsApp conectado.**

    Esta rota consulta o agente Baileys em tempo real, retornando os chats
    presentes no WhatsApp do número sincronizado com o Tenant, ordenados
    da interação mais recente para a mais antiga.

    Cada item retornado contém:
    - `id`: JID completo do WhatsApp (ex: `5511999999999@s.whatsapp.net`)
    - `phone`: Número limpo
    - `name`: Nome exibido no WhatsApp (se disponível)
    - `unread_count`: Mensagens não lidas
    - `last_message_timestamp`: Timestamp UNIX da última mensagem
    - `is_group`: Se é uma conversa de grupo
    - `pinned`: Se está fixada

    **Requer bot conectado** (status CONNECTED).
    """
    from src.services.whatsapp_manager_service import WhatsAppManagerService
    from src.services.whatsapp_bridge_service import whatsapp_bridge

    # 1. Resolve a instância ativa do Tenant
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
    status_str = instance.status.value if hasattr(instance.status, "value") else str(instance.status)

    if status_str != "CONNECTED":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"O agente WhatsApp não está conectado. Status atual: {status_str}. Conecte o bot antes de listar conversas."
        )

    # 2. Consulta o Bridge diretamente
    result = await whatsapp_bridge.list_chats(session_id=instance.session_name)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao obter conversas do agente: {result.get('error', 'Erro desconhecido')}"
        )

    chats = result.get("chats", [])
    # Aplica limite no lado Python
    chats = chats[:limit]

    return {
        "total": result.get("total", len(chats)),
        "session_id": instance.session_name,
        "conversations": chats
    }


@router.get("/conversations/{jid:path}")
async def get_conversation_history(
    jid: str,
    limit: int = Query(50, ge=1, le=200, description="Mensagens por página."),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    📖 **Retorna o histórico de mensagens de uma conversa específica diretamente do WhatsApp.**

    Consulta o agente Baileys em tempo real e retorna as mensagens trocadas
    com o contato identificado pelo `jid` (ID da conversa no WhatsApp).

    - O `jid` pode ser:
      - Número individual: `5511999999999@s.whatsapp.net`
      - ID de grupo: `120363xxxxxxx@g.us`
      - Apenas o número: `5511999999999` (será normalizado automaticamente)

    Cada mensagem retornada contém:
    - `message_id`: ID único da mensagem no WhatsApp
    - `from_me`: Se foi enviada pelo bot/agente
    - `sender`: JID do remetente
    - `content`: Texto da mensagem
    - `type`: Tipo (textMessage, imageMessage, audioMessage, etc.)
    - `timestamp`: Timestamp UNIX
    - `status`: Status de entrega

    **Requer bot conectado** (status CONNECTED).
    """
    from src.services.whatsapp_manager_service import WhatsAppManagerService
    from src.services.whatsapp_bridge_service import whatsapp_bridge

    # 1. Resolve a instância ativa
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
    status_str = instance.status.value if hasattr(instance.status, "value") else str(instance.status)

    if status_str != "CONNECTED":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"O agente WhatsApp não está conectado. Status atual: {status_str}."
        )

    # 2. Normaliza o JID se passou apenas o número
    normalized_jid = jid if "@" in jid else f"{jid}@s.whatsapp.net"

    # 3. Consulta o Bridge diretamente
    result = await whatsapp_bridge.get_chat_history(
        session_id=instance.session_name,
        jid=normalized_jid,
        limit=limit
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao obter histórico do agente: {result.get('error', 'Erro desconhecido')}"
        )

    return {
        "jid": result.get("jid"),
        "phone": result.get("phone"),
        "total_messages": result.get("total"),
        "has_more": result.get("has_more", False),
        "messages": result.get("messages", [])
    }

