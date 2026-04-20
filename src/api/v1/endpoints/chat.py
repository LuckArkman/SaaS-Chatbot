from typing import Any, Dict, List, Optional
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
    from src.services.chat_service import ChatService
    from src.models.mongo.chat import MessageDocument
    from src.models.chat import MessageSide

    # 1. O frontend muitas vezes passa o ID físico de Contato, Conversa ou JID WhatsApp.
    try:
        target_phone = await ChatService._resolve_recipient_phone(db, tenant_id, conversation_id)
    except ValueError:
        return []
    
    # 2. Restauração automática de histórico do WhatsApp Web
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
            # Sincroniza histórico bridge exclusivamente no MongoDB
            if history_response.get("success"):
                msgs = history_response.get("messages", [])
                if msgs:
                    await MessageHistoryService.sync_bridge_history(target_phone, msgs)
    except Exception as e:
        logger.warning(f"Não foi possível sincronizar o histórico pré-cadastro com o WhatsApp: {e}")

    # 3. Leitura EXCLUSIVA do MongoDB (Golden Source) - Eliminando a dupla averiguação c/ Postgres
    mongo_docs = await MessageDocument.find(
        MessageDocument.tenant_id == tenant_id,
        MessageDocument.contact_phone == target_phone
    ).sort("-timestamp").skip(offset).limit(limit).to_list()
    
    if conversation_id != target_phone:
        extra_docs = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == conversation_id
        ).sort("-timestamp").skip(offset).limit(limit).to_list()
        mongo_docs.extend(extra_docs)
    
    response_list = []
    
    for doc in mongo_docs:
        src_val = doc.source.value if hasattr(doc.source, "value") else str(doc.source)
        
        if src_val == "user":
            side = MessageSide.CLIENT
        elif src_val in ["agent", "human"]:
            side = MessageSide.AGENT
        elif src_val == "system":
            side = MessageSide.SYSTEM
        else:
            side = MessageSide.BOT
            
        status_map = {0: "PENDING", 1: "SENT", 2: "DELIVERED", 3: "READ"}
        ack_val = getattr(doc, "ack", 0)
        
        response_list.append({
            "id": str(doc.id),
            "conversation_id": str(conversation_id),
            "is_read": ack_val == 3,
            "agent_id": None,
            "status": status_map.get(ack_val, "SENT"),
            "content": doc.content,
            "side": side,
            "type": getattr(doc, "message_type", "text"),
            "external_id": doc.external_id,
            "created_at": doc.timestamp,
            "contact": {
                "id": doc.contact_phone,
                "full_name": doc.contact_name or getattr(doc, "notify_name", doc.contact_phone),
                "phone_number": doc.contact_phone
            }
        })
        
    return response_list

@router.post("/transfer/{conversation_id}", status_code=status.HTTP_200_OK)
async def transfer_chat_endpoint(
    conversation_id: str,
    target_agent_id: int = Query(...),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Transfere uma conversa para outro agente."""
    from src.models.user import User
    # Busca o agente alvo diretamente pelo ID (Postgres — domínio de usuários)
    target_agent = db.query(User).filter(
        User.id == target_agent_id,
        User.is_agent == True,
    ).first()
    if not target_agent:
        return {"error": "Agente alvo não encontrado ou indisponível"}

    target_agent.current_chats_count += 1
    db.commit()
    success = True

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
    
    # 🔧 FIX: Filtragem rigorosa para evitar "Contatos S/ Nome" bizarros provenientes de Grupos/Newsletters (IDs com 18 dígitos)
    # Apenas JIDs terminados com @s.whatsapp.net ou @c.us devem ser exibidos no CRM
    filtered_chats = []
    for chat in chats:
        chat_id = chat.get("id", "")
        if chat_id.endswith("@s.whatsapp.net") or chat_id.endswith("@c.us") or "@" not in chat_id:
            filtered_chats.append(chat)
            
    chats = filtered_chats[:limit]

    # ── ENRIQUECIMENTO DE NOMES ──────────────────────────────────────────────
    # Prioridade: Postgres (CRM local) → MongoDB (pushName do WhatsApp) → fallback
    if chats:
        # 1. Monta um mapa de telefone → nome a partir do Postgres
        from src.models.contact import Contact
        from src.models.mongo.chat import MessageDocument
        
        # Extrai os números de telefone limpos de todos os chats
        phone_set = set()
        for chat in chats:
            raw_id = chat.get("id", "")
            phone = raw_id.split("@")[0] if "@" in raw_id else raw_id
            phone = "".join(filter(str.isdigit, phone))
            if phone:
                phone_set.add(phone)

        # Busca em lote no Postgres
        postgres_names: Dict[str, str] = {}
        try:
            pg_contacts = db.query(Contact).filter(
                Contact.tenant_id == tenant_id,
                Contact.phone_number.in_(list(phone_set))
            ).all()
            for c in pg_contacts:
                if c.phone_number and c.full_name:
                    postgres_names[c.phone_number] = c.full_name
        except Exception as pg_err:
            logger.warning(f"[Conversations] Falha ao enriquecer nomes via Postgres: {pg_err}")

        # Busca o pushName mais recente de cada telefone no MongoDB
        mongo_names: Dict[str, str] = {}
        try:
            from beanie.operators import In as MongoIn
            mongo_docs = await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MongoIn(MessageDocument.contact_phone, list(phone_set)),
                MessageDocument.contact_name != None,
            ).sort("-timestamp").to_list()
            for doc in mongo_docs:
                if doc.contact_phone not in mongo_names and doc.contact_name:
                    mongo_names[doc.contact_phone] = doc.contact_name
        except Exception as mongo_err:
            logger.warning(f"[Conversations] Falha ao enriquecer nomes via MongoDB: {mongo_err}")

        # Aplica o enriquecimento em cada chat da lista
        enriched = []
        for chat in chats:
            raw_id = chat.get("id", "")
            phone = raw_id.split("@")[0] if "@" in raw_id else raw_id
            phone = "".join(filter(str.isdigit, phone))

            resolved_name = (
                postgres_names.get(phone)
                or mongo_names.get(phone)
                or chat.get("name")
                or chat.get("pushName")
                or (f"...{phone[-4:]}" if len(phone) >= 4 else phone)
            )
            enriched.append({**chat, "name": resolved_name, "phone": phone})
        chats = enriched

    return {
        "total": result.get("total", len(chats)),
        "session_id": instance.session_name,
        "conversations": chats
    }


@router.get("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def get_conversation_history(
    conversation_id: str,
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

    # 2. Resolve o ID da conversa -> telefone do contato
    target_phone = None
    
    # 2.1 Verifica se o conversation_id fornecido é um JID do WhatsApp ou um Telefone cru longo
    if "@" in conversation_id:
        target_phone = conversation_id.split("@")[0]
    elif conversation_id.isdigit() and len(conversation_id) > 8:
        # Assumimos que é um telefone JID cru, como "5511999999999"
        target_phone = conversation_id
    else:
        # Resolução por ID Postgres (Conversation table) foi removida.
        # O frontend deve passar o contact_phone ou JID WhatsApp como conversation_id.
        target_phone = None

    if not target_phone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversa não encontrada para este conversation_id."
        )

    normalized_jid = target_phone if "@" in target_phone else f"{target_phone}@s.whatsapp.net"

    async def load_mongo_history(phone: str) -> List[MessageDocument]:
        return await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == phone
        ).sort("+timestamp").to_list()

    def serialize_mongo_messages(messages: List[MessageDocument]) -> List[Dict[str, Any]]:
        serialized: List[Dict[str, Any]] = []
        for doc in messages:
            src_val = doc.source.value if hasattr(doc.source, "value") else str(doc.source)
            is_from_me = src_val in ("agent", "bot", "human", "system")
            serialized.append({
                "message_id": doc.external_id or str(doc.id),
                "from_me": is_from_me,
                "side": "bot" if is_from_me else "client",
                "sender": instance.session_name if is_from_me else target_phone,
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
                    await MessageHistoryService.sync_bridge_history(target_phone, bridge_messages)
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
    serialized_history = serialize_mongo_messages(mongo_history)
    serialized_history = dedupe_and_sort(serialized_history)

    return {
        "jid": normalized_jid,
        "phone": target_phone,
        "total_messages": len(serialized_history),
        "has_more": len(serialized_history) > limit,
        "messages": serialized_history[:limit]
    }

