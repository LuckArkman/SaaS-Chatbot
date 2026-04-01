from typing import List, Optional, Any, Dict
from datetime import datetime
from src.models.mongo.chat import MessageDocument, MessageSource
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageSide
from src.core.bus import rabbitmq_bus
from src.core.redis import redis_client
from src.core.ws import ws_manager
from sqlalchemy.orm import Session
from loguru import logger

class ChatService:
    """
    Serviço Unificado de Chat (Postgres + MongoDB).
    Controla interações em tempo real (Sprint 21) e Persistência de Histórico (Sprint 40).
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🔍 RESOLVER MULTI-FONTE DE DESTINATÁRIO
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    async def _resolve_recipient_phone(
        db: Session,
        tenant_id: str,
        conversation_id: str
    ) -> str:
        """
        Resolve o número de telefone do destinatário a partir de múltiplas fontes,
        em ordem de prioridade — garante que qualquer formato enviado pelo front-end
        seja traduzido para um número real antes de publicar no RabbitMQ.

        Estratégias (em cascata):
          1️⃣  JID WhatsApp  (ex: '5511999999999@s.whatsapp.net') → extrai phone
          2️⃣  Número longo  (10+ dígitos)                        → usa diretamente
          3️⃣  ID Postgres   (< 10 dígitos numérico)              → busca conversations.contact_phone
          4️⃣  Fallback Bridge: varre chats abertos + contatos do WhatsApp ativo do Tenant
        """
        from src.models.chat import Conversation
        from src.models.whatsapp import WhatsAppStatus
        from src.services.whatsapp_manager_service import WhatsAppManagerService
        from src.services.whatsapp_bridge_service import whatsapp_bridge

        # ── Estratégia 1: JID WhatsApp completo ──────────────────────────────
        if "@" in conversation_id:
            phone = conversation_id.split("@")[0]
            logger.debug(f"📱 [Resolver] Destinatário via JID: {phone}")
            return phone

        # ── Estratégia 2: Número de telefone longo (10+ dígitos) ─────────────
        digits = "".join(filter(str.isdigit, conversation_id))
        if len(digits) >= 10:
            logger.debug(f"📱 [Resolver] Destinatário via número direto: {digits}")
            return digits

        # ── Estratégia 3: ID numérico curto do Postgres ──────────────────────
        if conversation_id.isdigit():
            conv = db.query(Conversation).filter(
                Conversation.id == int(conversation_id),
                Conversation.tenant_id == tenant_id
            ).first()
            if conv and conv.contact_phone:
                logger.debug(
                    f"📱 [Resolver] Destinatário via Postgres "
                    f"(conversa #{conversation_id}): {conv.contact_phone}"
                )
                return conv.contact_phone

            logger.warning(
                f"⚠️ [Resolver] Conversa #{conversation_id} não encontrada no Postgres. "
                f"Consultando o agente WhatsApp do Tenant '{tenant_id}'..."
            )

        # ── Estratégia 4: Fallback — Bridge WhatsApp (chats + contatos) ──────
        try:
            instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
            status_str = (
                instance.status.value
                if hasattr(instance.status, "value")
                else str(instance.status)
            )

            if status_str != WhatsAppStatus.CONNECTED.value:
                raise ValueError(
                    f"O bot WhatsApp não está conectado (Status: '{status_str}'). "
                    f"Conecte o agente antes de enviar mensagens."
                )

            # 4a. Lista de conversas abertas no WhatsApp (mais confiável — dados em cache)
            chats_result = await whatsapp_bridge.list_chats(session_id=instance.session_name)
            if chats_result.get("success"):
                for chat in chats_result.get("chats", []):
                    jid   = chat.get("id", "")       # ex: "5511999999999@s.whatsapp.net"
                    phone = chat.get("phone", "")    # ex: "5511999999999"
                    # Matching: por JID exato, phone exato, ou por prefixo numérico
                    if (
                        jid == conversation_id
                        or phone == conversation_id
                        or jid.startswith(f"{conversation_id}@")
                        or phone.endswith(digits) and len(digits) >= 6
                    ):
                        logger.info(
                            f"✅ [Resolver] Destinatário encontrado via lista de chats "
                            f"do Bridge: {phone} (JID: {jid})"
                        )
                        return phone

            # 4b. Lista de contatos conhecidos pelo agente WhatsApp
            contacts_result = await whatsapp_bridge.list_contacts(session_id=instance.session_name)
            if contacts_result.get("success"):
                for contact in contacts_result.get("contacts", []):
                    jid   = contact.get("jid", "")
                    phone = contact.get("phone", "")
                    if (
                        jid == conversation_id
                        or phone == conversation_id
                        or jid.startswith(f"{conversation_id}@")
                    ):
                        logger.info(
                            f"✅ [Resolver] Destinatário encontrado via lista de contatos "
                            f"do Bridge: {phone} (JID: {jid})"
                        )
                        return phone

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"❌ [Resolver] Falha ao consultar Bridge WhatsApp: {e}")

        raise ValueError(
            f"Destinatário não encontrado para conversation_id='{conversation_id}'. "
            f"Formatos aceitos: JID WhatsApp (ex: 5511999@s.whatsapp.net), "
            f"número de telefone (10+ dígitos) ou ID de conversa Postgres existente."
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 📤 ENVIO DE MENSAGEM PELO AGENTE
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    async def send_agent_message(db: Session, tenant_id: str, agent_id: str, payload: Dict[str, Any]):
        """
        Envia uma mensagem do agente para o cliente final e persiste no histórico (Dual Write).
        O campo 'conversation_id' aceita: ID Postgres, JID WhatsApp ou número de telefone.
        """
        raw_conversation_id = str(payload.get("conversation_id") or "").strip()
        content = (payload.get("content") or "").strip()

        if not raw_conversation_id or not content:
            raise ValueError("Os campos 'conversation_id' e 'content' são obrigatórios.")

        # 🔍 Resolve o número de telefone do destinatário via cascata multi-fonte
        contact_phone = await ChatService._resolve_recipient_phone(db, tenant_id, raw_conversation_id)

        # 1. Persistência Dual (Postgres + MongoDB via MessageHistoryService)
        await MessageHistoryService.record_message(
            db=db,
            contact_phone=contact_phone,
            content=content,
            side=MessageSide.AGENT,
            agent_id=int(agent_id),
            session_name=f"tenant_{tenant_id}"
        )

        # 🟢 Atualiza SLA de Primeira Resposta (Sprint 25)
        conversation = MessageHistoryService.get_or_create_conversation(db, contact_phone)
        if not conversation.first_response_at:
            conversation.first_response_at = datetime.utcnow()
            db.commit()

        # 2. Dispatch para o Canal (via RabbitMQ → OutgoingMessageWorker → Bridge)
        await rabbitmq_bus.publish(
            exchange_name="messages_exchange",
            routing_key="message.outgoing",
            message={
                "tenant_id": tenant_id,
                "agent_id": agent_id,
                "to": contact_phone,
                "content": content,
                "type": "text"
            }
        )

        # 3. Sync em tempo real para outras abas/agentes do mesmo Tenant (WebSocket)
        await ws_manager.send_to_conversation(tenant_id, raw_conversation_id, {
            "agent_id": agent_id,
            "content": content,
            "side": "agent",
            "timestamp": str(datetime.utcnow())
        })

        logger.info(f"✅ Agente {agent_id} → '{contact_phone}' (origem: '{raw_conversation_id}'): '{content[:60]}'")



    @staticmethod
    async def set_typing_status(tenant_id: str, conversation_id: str, is_typing: bool):
        """Define o status de 'digitando' no Redis e notifica outros agentes."""
        key = f"typing:{tenant_id}:{conversation_id}"
        if is_typing:
            # TTL de 5s para não prender o status se travar
            await redis_client.set(key, "typing", expire=5)
        else:
            await redis_client.delete(key)

        await ws_manager.send_to_conversation(tenant_id, conversation_id, {
            "type": "typing_update",
            "is_typing": is_typing,
            "conversation_id": conversation_id
        })

    # --- 🔵 Lógica Nova de Histórico (MongoDB) ---

    @staticmethod
    async def save_message(
        tenant_id: str,
        session_name: str,
        contact_phone: str,
        content: str,
        source: MessageSource,
        contact_name: Optional[str] = None,
        message_type: str = "text",
        external_id: Optional[str] = None,
        flow_id: Optional[str] = None
    ) -> MessageDocument:
        """Salva uma mensagem diretamente no MongoDB (Beanie)."""
        try:
            message = MessageDocument(
                tenant_id=tenant_id,
                session_name=session_name,
                contact_phone=contact_phone,
                contact_name=contact_name,
                content=content,
                source=source,
                message_type=message_type,
                external_id=external_id,
                flow_id=flow_id,
                timestamp=datetime.utcnow()
            )
            await message.insert()
            return message
        except Exception as e:
            logger.error(f"❌ Erro ao salvar mensagem no MongoDB: {e}")
            raise

    @staticmethod
    async def get_history(
        tenant_id: str,
        contact_phone: str,
        limit: int = 50
    ) -> List[MessageDocument]:
        """Recupera o histórico de conversas de um contato."""
        try:
            return await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.contact_phone == contact_phone
            ).sort("-timestamp").limit(limit).to_list()
        except Exception as e:
            logger.error(f"❌ Erro ao buscar histórico no MongoDB: {e}")
            return []

    @staticmethod
    async def get_session_history(
        tenant_id: str,
        session_name: str,
        limit: int = 100
    ) -> List[MessageDocument]:
        """Recupera o histórico de uma sessão inteira (vários contatos)."""
        try:
            # Retorna em ordem cronológica (sort timestamp ascendente para o Front)
            docs = await MessageDocument.find(
                MessageDocument.tenant_id == tenant_id,
                MessageDocument.session_name == session_name
            ).sort("+timestamp").limit(limit).to_list()
            return docs
        except Exception as e:
            logger.error(f"❌ Erro ao buscar histórico da sessão: {e}")
            return []

chat_service = ChatService()
