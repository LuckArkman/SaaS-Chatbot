"""
MessageHistoryService — Persistência de histórico de mensagens.

Arquitetura:
  - MongoDB  → Fonte de verdade para TODAS as mensagens e histórico.
  - Postgres → Apenas contatos, usuários e bots. NÃO é usado aqui.

A tabela Conversation do Postgres foi removida deste fluxo.
"""
from datetime import datetime
from loguru import logger
from typing import List, Optional
from src.models.chat import MessageSide, MessageStatus
from src.core.tenancy import get_current_tenant_id


class MessageHistoryService:
    """
    Serviço central de persistência de histórico de chat — MongoDB exclusivo.
    Postgres NÃO é utilizado para nenhuma operação de mensagem ou conversa.
    """

    # ─────────────────────────────────────────────────────────────────────────
    # record_message — salva uma mensagem no MongoDB
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    async def record_message(
        contact_phone: str,
        content: str,
        side: MessageSide,
        agent_id: Optional[int] = None,
        msg_type: str = "text",
        external_id: Optional[str] = None,
        status: MessageStatus = MessageStatus.SENT,
        session_name: Optional[str] = None,
        # db mantido como parâmetro opcional para compatibilidade com chamadores antigos
        db=None,
    ) -> dict:
        """Salva a mensagem exclusivamente no MongoDB."""
        from src.models.mongo.chat import MessageDocument, MessageSource
        from src.services.chat_service import chat_service

        tenant_id = get_current_tenant_id()

        source_map = {
            MessageSide.CLIENT: MessageSource.USER,
            MessageSide.BOT:    MessageSource.AGENT,
            MessageSide.AGENT:  MessageSource.HUMAN,
            MessageSide.SYSTEM: MessageSource.SYSTEM,
        }

        mongo_msg = await chat_service.save_message(
            tenant_id=tenant_id,
            session_name=session_name or f"tenant_{tenant_id}",
            contact_phone=contact_phone,
            content=content,
            source=source_map.get(side, MessageSource.SYSTEM),
            message_type=msg_type,
            external_id=external_id,
        )

        logger.debug(f"💾 Mensagem salva no MongoDB (ID: {mongo_msg.id}) para {contact_phone}")
        return {
            "id": str(mongo_msg.id),
            "conversation_id": contact_phone,   # Identificador por telefone — sem Postgres
            "content": content,
            "side": side,
            "status": status,
            "created_at": datetime.utcnow(),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # update_message_status — atualiza o ACK da mensagem no MongoDB
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    async def update_message_status(
        external_id: str,
        new_status: MessageStatus,
        # db mantido como parâmetro opcional para compatibilidade
        db=None,
    ) -> bool:
        """Atualiza o status (ack) de uma mensagem exclusivamente no MongoDB."""
        from src.models.mongo.chat import MessageDocument

        ack_map = {
            MessageStatus.SENT:      1,
            MessageStatus.DELIVERED: 2,
            MessageStatus.READ:      3,
            MessageStatus.ERROR:    -1,
        }

        mongo_msg = await MessageDocument.find_one(MessageDocument.external_id == external_id)
        if not mongo_msg:
            logger.debug(f"[ACK] Mensagem '{external_id}' não encontrada no MongoDB — ignorando ACK.")
            return False

        new_ack = ack_map.get(new_status, 0)

        # Não permite downgrade de status
        if new_ack > mongo_msg.ack:
            mongo_msg.ack = new_ack
            await mongo_msg.save()
            logger.debug(f"✔️ ACK {external_id} → {new_status.value} (ack={new_ack})")
            return True

        return False

    # ─────────────────────────────────────────────────────────────────────────
    # list_history — histórico paginado de um contato (MongoDB)
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    async def list_history(
        contact_phone: str,
        limit: int = 50,
        offset: int = 0,
        db=None,
    ) -> List[dict]:
        """Busca o histórico de mensagens exclusivamente no MongoDB."""
        from src.models.mongo.chat import MessageDocument

        tenant_id = get_current_tenant_id()

        mongo_docs = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == contact_phone,
        ).sort("-timestamp").skip(offset).limit(limit).to_list()

        result = []
        for doc in mongo_docs:
            result.append({
                "id": str(doc.id),
                "content": doc.content,
                "side": MessageSide.CLIENT if doc.source == "user" else MessageSide.BOT,
                "type": doc.message_type,
                "external_id": doc.external_id,
                "created_at": doc.timestamp,
                "status": "read" if doc.ack == 3 else "sent",
            })
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # sync_bridge_history — injeta histórico retroativo do Baileys (MongoDB)
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    async def sync_bridge_history(
        contact_phone: str,
        bridge_messages: List[dict],
        db=None,
    ):
        """
        Injeta o histórico bruto vindo da Bridge exclusivamente no MongoDB.
        Usado para restaurar histórico retroativo do WhatsApp.
        """
        from src.models.mongo.chat import MessageDocument, MessageSource

        tenant_id = get_current_tenant_id()

        # IDs externos já existentes no MongoDB — evita duplicação
        existing_ids = {
            doc.external_id for doc in await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == contact_phone,
                MessageDocument.external_id != None,
            ).to_list()
        }

        # Conteúdos locais sem external_id — evita duplicação de msgs enviadas pelo sistema
        existing_local_contents = {
            doc.content for doc in await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == contact_phone,
                MessageDocument.external_id == None,
            ).to_list()
        }

        new_docs = []
        for b_msg in bridge_messages:
            msg_id  = b_msg.get("message_id")
            content = b_msg.get("content", "")

            if msg_id in existing_ids:
                continue
            if content and content in existing_local_contents:
                continue

            from_me = b_msg.get("from_me", False)
            source  = MessageSource.AGENT if from_me else MessageSource.USER
            msg_type = b_msg.get("type", "text")

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
                ack=3 if not from_me else 2,
                timestamp=created_dt,
            )
            new_docs.append(doc)

        if new_docs:
            await MessageDocument.insert_many(new_docs)
            logger.info(f"🔄 Restauradas {len(new_docs)} mensagens antigas no MongoDB para {contact_phone}")

    # ─────────────────────────────────────────────────────────────────────────
    # get_recent_messages — contexto de IA (MongoDB)
    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    async def get_recent_messages(
        contact_phone: str,
        limit: int = 10,
        db=None,
    ) -> List[dict]:
        """Recupera mensagens recentes do MongoDB para contexto de IA."""
        from src.models.mongo.chat import MessageDocument

        tenant_id = get_current_tenant_id()

        mongo_docs = await MessageDocument.find(
            MessageDocument.tenant_id == tenant_id,
            MessageDocument.contact_phone == contact_phone,
        ).sort("-timestamp").limit(limit).to_list()

        result = []
        for doc in reversed(mongo_docs):  # Ordem cronológica para a IA
            result.append({
                "side": MessageSide.CLIENT if doc.source == "user" else MessageSide.BOT,
                "content": doc.content,
            })
        return result
