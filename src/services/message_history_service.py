from sqlalchemy.orm import Session
from datetime import datetime
from src.models.chat import Conversation, Message, MessageSide, MessageStatus
from src.core.tenancy import get_current_tenant_id
from loguru import logger
from typing import List, Optional

class MessageHistoryService:
    """
    Serviço central de persistência de histórico de chat (Postgres).
    Replica a lógica da camada de dados do ChatApp original.
    """
    @staticmethod
    def get_or_create_conversation(db: Session, contact_phone: str) -> Conversation:
        tenant_id = get_current_tenant_id()
        
        conversation = db.query(Conversation).filter(
            Conversation.contact_phone == contact_phone,
            Conversation.tenant_id == tenant_id
        ).first()

        if not conversation:
            conversation = Conversation(
                contact_phone=contact_phone,
                last_interaction=datetime.utcnow(),
                is_active=True
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            logger.info(f"📁 Nova conversa persistida no Postgres para {contact_phone} (Tenant: {tenant_id})")
            
        return conversation

    @staticmethod
    async def record_message(
        db: Session, 
        contact_phone: str, 
        content: str, 
        side: MessageSide,
        agent_id: Optional[int] = None,
        msg_type: str = "text",
        external_id: Optional[str] = None,
        status: MessageStatus = MessageStatus.SENT,
        session_name: Optional[str] = None
    ) -> dict: # Retorna um dicionário com os dados da mensagem (agora no MongoDB)
        """Salva uma mensagem exclusivamente no histórico do MongoDB e atualiza o metadado da conversa no Postgres."""
        conversation = MessageHistoryService.get_or_create_conversation(db, contact_phone)
        tenant_id = get_current_tenant_id()
        
        # 🟢 1. Atualiza metadados da conversa no Postgres
        conversation.last_message_content = content[:50] + ("..." if len(content) > 50 else "")
        conversation.last_interaction = datetime.utcnow()
        db.commit()

        # 🟢 2. Persistência MongoDB enviando como fonte da verdade
        from src.services.chat_service import chat_service
        from src.models.mongo.chat import MessageSource
        
        source_map = {
            MessageSide.CLIENT: MessageSource.USER,
            MessageSide.BOT: MessageSource.AGENT,
            MessageSide.AGENT: MessageSource.HUMAN,
            MessageSide.SYSTEM: MessageSource.SYSTEM
        }
        
        try:
            mongo_msg = await chat_service.save_message(
                tenant_id=tenant_id,
                session_name=session_name or f"tenant_{tenant_id}",
                contact_phone=contact_phone,
                content=content,
                source=source_map.get(side, MessageSource.SYSTEM),
                message_type=msg_type,
                external_id=external_id
            )
            
            logger.debug(f"💾 Mensagem salva no MongoDB (ID: {mongo_msg.id}) para {contact_phone}")
            return {
                "id": str(mongo_msg.id),
                "conversation_id": conversation.id,
                "content": content,
                "side": side,
                "status": status,
                "created_at": datetime.utcnow()
            }
        except Exception as e:
            logger.error(f"⚠️ Falha ao persistir mensagem no MongoDB: {e}")
            raise e

    @staticmethod
    async def update_message_status(db: Session, external_id: str, new_status: MessageStatus) -> bool:
        """Atualiza o status (ack) de uma mensagem EXCLUSIVAMENTE no MongoDB."""
        from src.models.mongo.chat import MessageDocument
        
        # Mapeamento do MessageStatus para o valor ACK numérico do Baileys
        ack_map = {
            MessageStatus.SENT: 1,
            MessageStatus.DELIVERED: 2,
            MessageStatus.READ: 3,
            MessageStatus.ERROR: -1
        }
        
        mongo_msg = await MessageDocument.find_one(MessageDocument.external_id == external_id)
        if not mongo_msg:
            return False
            
        new_ack = ack_map.get(new_status, 0)
        
        # Não permite 'downgrade' de status no ACK
        if new_ack > mongo_msg.ack:
            mongo_msg.ack = new_ack
            await mongo_msg.save()
            logger.debug(f"✔️ Status da Mensagem {external_id} atualizado para {new_status} no MongoDB")
            return True
            
        return False

    @staticmethod
    async def list_history(
        db: Session, 
        contact_phone: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> List[dict]:
        """Busca o histórico de mensagens EXCLUSIVAMENTE no MongoDB."""
        from src.models.mongo.chat import MessageDocument
        tenant_id = get_current_tenant_id()
        
        mongo_docs = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == contact_phone
        ).sort("-timestamp").skip(offset).limit(limit).to_list()
        
        # Mapeamento para dicionário compatível com o schema do frontend
        result = []
        for doc in mongo_docs:
            result.append({
                "id": str(doc.id),
                "content": doc.content,
                "side": MessageSide.CLIENT if doc.source == "user" else MessageSide.BOT,
                "type": doc.message_type,
                "external_id": doc.external_id,
                "created_at": doc.timestamp,
                "status": "read" if doc.ack == 3 else "sent"
            })
        return result

    @staticmethod
    async def sync_bridge_history(db: Session, contact_phone: str, bridge_messages: List[dict]):
        """
        Injeta o histórico bruto vindo da Bridge EXCLUSIVAMENTE no MongoDB.
        Usado para restaurar histórico retroativo do WhatsApp.
        """
        from datetime import datetime
        from src.models.mongo.chat import MessageDocument, MessageSource
        tenant_id = get_current_tenant_id()
        
        # Pega IDs externos existentes no MongoDB para evitar dublagem
        existing_ids = {
            doc.external_id for doc in await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == contact_phone,
                MessageDocument.external_id != None
            ).to_list()
        }
        
        # Pega conteúdos existentes localmente no MongoDB onde external_id é null para evitar
        # duplicação de envios feitos pelo próprio sistema antes de termos o ID oficial
        existing_local_contents = {
            doc.content for doc in await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == contact_phone,
                MessageDocument.external_id == None
            ).to_list()
        }
        
        new_docs = []
        for b_msg in bridge_messages:
            msg_id = b_msg.get("message_id")
            content = b_msg.get("content", "")
            
            if msg_id in existing_ids:
                continue
            
            if content and content in existing_local_contents:
                continue
                
            from_me = b_msg.get("from_me", False)
            source = MessageSource.AGENT if from_me else MessageSource.USER
            msg_type = b_msg.get("type", "text")
            
            # Timestamp (se houver e for válido)
            ts = b_msg.get("timestamp")
            created_dt = datetime.utcnow()
            if ts:
                try:
                    created_dt = datetime.fromtimestamp(int(ts))
                except Exception:
                    pass

            doc = MessageDocument(
                tenant_id=tenant_id,
                session_name=f"tenant_{tenant_id}",
                contact_phone=contact_phone,
                content=content,
                source=source,
                message_type=msg_type,
                external_id=msg_id,
                ack=3 if not from_me else 2, # Assume Read para entrada e Delivered para saída
                timestamp=created_dt
            )
            new_docs.append(doc)
            
        if new_docs:
            await MessageDocument.insert_many(new_docs)
            
            # Atualiza metadados da última mensagem no Postgres Conversation
            last_msg = sorted(new_docs, key=lambda x: x.timestamp)[-1]
            conversation = MessageHistoryService.get_or_create_conversation(db, contact_phone)
            conversation.last_message_content = last_msg.content[:50] + ("..." if len(last_msg.content) > 50 else "")
            conversation.last_interaction = last_msg.timestamp
            db.commit()
            
            logger.info(f"🔄 Restauradas {len(new_docs)} mensagens antigas no MongoDB para {contact_phone}")

    @staticmethod
    async def list_conversations(
        db: Session,
        tenant_id: str,
        only_active: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[int, List]:
        """
        Retorna a lista paginada de todas as conversas do Tenant,
        com contagens calculadas consultando o MongoDB.
        """
        from src.models.mongo.chat import MessageDocument
        
        query = db.query(Conversation).filter(
            Conversation.tenant_id == tenant_id
        )
        
        if only_active:
            query = query.filter(Conversation.is_active == True)
        
        query = query.order_by(Conversation.last_interaction.desc())
        
        total = query.count()
        conversations = query.offset(offset).limit(limit).all()
        
        # Enriquecer cada conversa com contagens calculadas no MongoDB
        result = []
        for conv in conversations:
            total_msgs = await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == conv.contact_phone
            ).count()
            
            unread_count = await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == conv.contact_phone,
                MessageDocument.ack < 3, # Nao lida
                MessageDocument.source == "user" # Do cliente
            ).count()
            
            conv_dict = {
                "id": conv.id,
                "contact_phone": conv.contact_phone,
                "last_message_content": conv.last_message_content,
                "last_interaction": conv.last_interaction,
                "is_active": conv.is_active,
                "agent_id": conv.agent_id,
                "agent": conv.agent,
                "unread_count": unread_count,
                "total_messages": total_msgs,
            }
            result.append(conv_dict)
        
        logger.debug(f"📋 Listando {len(result)} conversas para Tenant {tenant_id} (total={total})")
        return total, result

    @staticmethod
    async def get_conversation_detail(
        db: Session,
        tenant_id: str,
        conversation_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> Optional[dict]:
        """
        Retorna a conversa com um contato específico, incluindo o histórico
        de mensagens paginado do MongoDB.
        """
        from src.models.mongo.chat import MessageDocument
        
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id
        ).first()
        
        if not conversation:
            return None
        
        total_msgs = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == conversation.contact_phone
        ).count()
        
        unread_count = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == conversation.contact_phone,
            MessageDocument.ack < 3,
            MessageDocument.source == "user"
        ).count()
        
        # Busca mensagens no MongoDB
        mongo_docs = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == conversation.contact_phone
        ).sort("-timestamp").skip(offset).limit(limit).to_list()
        
        # Mapeia mensagens do MongoDB para o formato esperado
        messages = []
        for doc in mongo_docs:
            messages.append({
                "id": str(doc.id),
                "content": doc.content,
                "side": MessageSide.CLIENT if doc.source == "user" else MessageSide.BOT,
                "type": doc.message_type,
                "external_id": doc.external_id,
                "created_at": doc.timestamp,
                "status": "read" if doc.ack == 3 else "sent"
            })
            
            # Marca como lida no MongoDB se for do cliente
            if doc.source == "user" and doc.ack < 3:
                doc.ack = 3
                await doc.save()
        
        logger.info(f"📖 Histórico carregado (MONGO): Conversa #{conversation_id} ({len(messages)} msgs) para Tenant {tenant_id}")
        
        return {
            "conversation": {
                "id": conversation.id,
                "contact_phone": conversation.contact_phone,
                "last_message_content": conversation.last_message_content,
                "last_interaction": conversation.last_interaction,
                "is_active": conversation.is_active,
                "agent_id": conversation.agent_id,
                "agent": conversation.agent,
                "unread_count": unread_count,
                "total_messages": total_msgs,
            },
            "messages": messages,
            "total_messages": total_msgs,
            "has_more": (offset + limit) < total_msgs
        }
    @staticmethod
    async def get_recent_messages(
        db: Session,
        contact_phone: str,
        limit: int = 10
    ) -> List[dict]:
        """Recupera mensagens recentes do MongoDB para contexto de IA."""
        from src.models.mongo.chat import MessageDocument
        tenant_id = get_current_tenant_id()
        
        mongo_docs = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == contact_phone
        ).sort("-timestamp").limit(limit).to_list()
        
        # Mapeia para um formato simples de dicionário
        result = []
        for doc in reversed(mongo_docs): # Ordem cronológica para a IA
            result.append({
                "side": MessageSide.CLIENT if doc.source == "user" else MessageSide.BOT,
                "content": doc.content
            })
        return result
