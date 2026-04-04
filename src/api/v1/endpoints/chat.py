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
    from src.services.whatsapp_bridge_service import whatsapp_bridge
    from src.services.whatsapp_manager_service import WhatsAppManagerService
    from src.models.chat import Conversation
    
    # 0. O frontend muitas vezes passa o ID físico da conversa ('id': 1) ou um JID ('xxx@s.whatsapp.net') em vez do telefone limpo.
    target_phone = conversation_id
    if "@" in conversation_id:
        target_phone = conversation_id.split("@")[0]
    elif conversation_id.isdigit() and len(conversation_id) < 10:
        conv = db.query(Conversation).filter(
            Conversation.id == int(conversation_id), 
            Conversation.tenant_id == tenant_id
        ).first()
        if not conv:
            return []
        target_phone = conv.contact_phone
    
    # Restauração automática de histórico do WhatsApp Web
    try:
        instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
        status_val = str(getattr(instance.status, "value", instance.status)).upper()
        if status_val == "CONNECTED":
            normalized_jid = target_phone if "@" in target_phone else f"{target_phone}@s.whatsapp.net"
            history_response = await whatsapp_bridge.get_chat_history(
                session_id=instance.session_name, 
                jid=normalized_jid, 
                limit=limit
            )
            if history_response.get("success"):
                msgs = history_response.get("messages", [])
                if msgs:
                    # Injeta silenciosamente no banco
                    await MessageHistoryService.sync_bridge_history(db, target_phone, msgs)
    except Exception as e:
        logger.warning(f"Não foi possível sincronizar o histórico pré-cadastro com o WhatsApp: {e}")

    # 1.5. Sincronização do Histórico do MongoDB (Fallback do Sprint 40 Restore)
    try:
        from src.services.chat_service import ChatService
        from src.models.mongo.chat import MessageSource
        
        mongo_history = await ChatService.get_history(tenant_id, target_phone, limit=500)
        # Resgata também as mensagens que acabaram salvas erroneamente com ID ao invés de telefone
        if conversation_id != target_phone:
            mongo_history.extend(await ChatService.get_history(tenant_id, conversation_id, limit=500))
        
        mongo_msgs = []
        for doc in mongo_history:
            src_val = doc.source.value if hasattr(doc.source, "value") else str(doc.source)
            mongo_msgs.append({
                "message_id": doc.external_id or str(doc.id),
                "from_me": (src_val == "agent" or src_val == "bot"),
                "content": doc.content,
                "type": getattr(doc, "message_type", "text"),
                "timestamp": doc.timestamp.timestamp() if doc.timestamp else None
            })
            
        if mongo_msgs:
            await MessageHistoryService.sync_bridge_history(db, target_phone, mongo_msgs)
    except Exception as e:
        logger.error(f"Erro ao sincronizar Mongo DB para Postgres: {e}")

    return MessageHistoryService.list_history(db, target_phone, limit, offset)

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
    status_str = str(getattr(instance.status, "value", instance.status)).upper()

    if status_str != "CONNECTED":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"O agente WhatsApp não está conectado. Status atual: {status_str.lower()}. Conecte o bot antes de listar conversas."
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


@router.get("/conversations/{jid:path}", response_model=Dict[str, Any])
async def get_conversation_history(
    jid: str,
    limit: int = Query(50, ge=1, le=200, description="Mensagens por página."),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    Retorna o histórico consolidado de uma conversa específica.

    A fonte principal é o MongoDB, onde o SaaS persiste o histórico de diálogo.
    Quando a conversa ainda não estiver materializada no Mongo, o bridge WhatsApp
    é usado apenas para backfill e a resposta final continua vindo do Mongo.
    """
    from src.services.whatsapp_manager_service import WhatsAppManagerService
    from src.services.whatsapp_bridge_service import whatsapp_bridge
    from src.models.mongo.chat import MessageDocument

    # 1. Resolve a instância ativa
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
    status_str = str(getattr(instance.status, "value", instance.status)).upper()

    # 2. Normaliza o JID se passou apenas o número
    normalized_jid = jid if "@" in jid else f"{jid}@s.whatsapp.net"
    target_phone = normalized_jid.split("@")[0]

    async def load_mongo_history(phone: str) -> List[MessageDocument]:
        return await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == phone
        ).sort("+timestamp").to_list()

    def serialize_mongo_messages(messages: List[MessageDocument]) -> List[Dict[str, Any]]:
        serialized: List[Dict[str, Any]] = []
        for doc in messages:
            src_val = doc.source.value if hasattr(doc.source, "value") else str(doc.source)
            serialized.append({
                "message_id": doc.external_id or str(doc.id),
                "from_me": src_val in ("agent", "bot", "human"),
                "sender": instance.session_name if src_val in ("agent", "bot", "human") else target_phone,
                "content": doc.content,
                "type": getattr(doc, "message_type", "text"),
                "timestamp": doc.timestamp.timestamp() if doc.timestamp else None,
                "status": doc.ack if hasattr(doc, "ack") else None
            })
        return serialized

    def dedupe_and_sort(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        by_key: Dict[str, Dict[str, Any]] = {}
        for msg in messages:
            key = str(msg.get("message_id") or msg.get("external_id") or msg.get("content") or "")
            if not key:
                continue
            by_key[key] = msg
        return sorted(
            by_key.values(),
            key=lambda item: item.get("timestamp") or 0
        )

    # 3. Leitura direta do MongoDB. O bridge só entra para backfill caso ainda
    #    não exista conversa materializada no banco.
    mongo_history = await load_mongo_history(target_phone)
    if not mongo_history and conversation_id != target_phone:
        mongo_history = await load_mongo_history(conversation_id)

    if not mongo_history and status_str == "CONNECTED":
        # Backfill opcional: materializa o histórico no Mongo e lê novamente.
        try:
            result = await whatsapp_bridge.get_chat_history(
                session_id=instance.session_name,
                jid=normalized_jid,
                limit=limit
            )
            if result.get("success"):
                bridge_messages = result.get("messages", [])
                if bridge_messages:
                    await MessageHistoryService.sync_bridge_history(db, target_phone, bridge_messages)
                    mongo_history = await load_mongo_history(target_phone)
        except Exception as e:
            logger.warning(f"Falha ao fazer backfill via Bridge para {normalized_jid}: {e}")

    if not mongo_history:
        return {
            "jid": normalized_jid,
            "phone": target_phone,
            "total_messages": 0,
            "has_more": False,
            "messages": []
        }

    # 4. Complementa com qualquer histórico que ainda esteja salvo com chave
    #    alternativa, sem depender do cache temporário do WhatsApp.
    if status_str == "CONNECTED":
        try:
            alt_history = await load_mongo_history(conversation_id)
            if alt_history and conversation_id != target_phone:
                mongo_history = dedupe_and_sort(
                    serialize_mongo_messages(mongo_history) + serialize_mongo_messages(alt_history)
                )
                return {
                    "jid": normalized_jid,
                    "phone": target_phone,
                    "total_messages": len(mongo_history),
                    "has_more": len(mongo_history) > limit,
                    "messages": mongo_history[:limit]
                }
        except Exception as e:
            logger.warning(f"Falha ao consultar histórico alternativo do Mongo para {normalized_jid}: {e}")

    serialized_history = serialize_mongo_messages(mongo_history)
    serialized_history = dedupe_and_sort(serialized_history)

    return {
        "jid": normalized_jid,
        "phone": target_phone,
        "total_messages": len(serialized_history),
        "has_more": len(serialized_history) > limit,
        "messages": serialized_history[:limit]
    }

