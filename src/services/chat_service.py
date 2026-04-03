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

    # ────────────────────────────────────────────────────────────────────────────
    # 📏 NORMALIZAÇÃO DE NÚM ERO DE TELEFONE
    # ────────────────────────────────────────────────────────────────────────────

    @staticmethod
    def normalize_phone(phone: str, country_code: str = "55") -> str:
        """
        Normaliza um número de telefone garantindo que o código de país (DDI) está presente.

        Lógica de decisão:
          ✅ Número com 12+ dígitos  → já contém DDI → usa diretamente (ex: '5511999882626')
          ➕ Número com 10-11 dígitos → sem DDI   → adiciona o country_code (padrão: '55' = Brasil)
          ⚠️  Número com < 10 dígitos   → formato inválido → retorna como está (o Bridge reportará o erro)

        Args:
            phone:        Número em qualquer formato (com/sem DDI, com/sem máscara)
            country_code: DDI a adicionar quando ausente (padrão '55' = Brasil)

        Returns:
            Número normalizado contendo obrigatoriamente o DDI, apenas dígitos.
        """
        digits = "".join(filter(str.isdigit, phone))

        # Já possui DDI: 12 dígitos (DDI2 + DDD2 + tel8) ou 13 (DDI2 + DDD2 + tel9)
        if len(digits) >= 12:
            logger.debug(f"[normalize_phone] '{phone}' já contém DDI → usando diretamente: {digits}")
            return digits

        # Sem DDI: 10 (DDD2+tel8) ou 11 (DDD2+tel9) → adiciona country_code
        if 10 <= len(digits) <= 11:
            normalized = f"{country_code}{digits}"
            logger.debug(f"[normalize_phone] '{phone}' sem DDI → adicionando +{country_code} → {normalized}")
            return normalized

        # Formato inesperado: retorna como está e deixa o Bridge reportar o problema
        logger.warning(f"[normalize_phone] '{phone}' com {len(digits)} dígitos — formato inesperado, usando sem alteração.")
        return digits


    
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
          3️⃣  ID numérico curto → busca PRIMEIRO nos chats abertos do Bridge (índice 1-based)
               depois na tabela conversations do Postgres como fallback
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

        # ── Estratégia 3: ID numérico curto ──────────────────────────────────
        #
        # O front-end envia o ID de um contato ou conversa registrado no Postgres.
        # A ordem correta de busca é:
        #   3a. Tabela `contacts`      (Contact.id)      — CRM local, fonte usada pela tela de Contatos
        #   3b. Tabela `conversations` (Conversation.id) — histórico de diálogos já persistidos
        #   3c. Lista de chats ao vivo do Bridge         — fallback se o registro ainda não existe localmente
        #
        if conversation_id.isdigit():
            numeric_id = int(conversation_id)

            # 3a. Tabela contacts (CRM local do Tenant) — fonte primária do front-end
            from src.models.contact import Contact
            contact = db.query(Contact).filter(
                Contact.id == numeric_id,
                Contact.tenant_id == tenant_id
            ).first()
            if contact and contact.phone_number:
                logger.info(
                    f"✅ [Resolver] Destinatário via tabela contacts "
                    f"(ID={numeric_id}): {contact.phone_number} — {contact.full_name or 'sem nome'}"
                )
                return contact.phone_number

            logger.debug(
                f"🔍 [Resolver] Contact ID={numeric_id} não encontrado. "
                f"Tentando tabela conversations..."
            )

            # 3b. Tabela conversations (diálogos já persistidos no histórico)
            conv = db.query(Conversation).filter(
                Conversation.id == numeric_id,
                Conversation.tenant_id == tenant_id
            ).first()
            if conv and conv.contact_phone:
                logger.info(
                    f"✅ [Resolver] Destinatário via tabela conversations "
                    f"(ID={numeric_id}): {conv.contact_phone}"
                )
                return conv.contact_phone

            logger.warning(
                f"⚠️ [Resolver] ID={numeric_id} não encontrado nas tabelas locais. "
                f"Consultando lista de chats ao vivo no Bridge WhatsApp..."
            )

            # 3c. Fallback: lista de chats ao vivo do Bridge (último recurso)
            try:
                instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
                status_str = (
                    instance.status.value
                    if hasattr(instance.status, "value")
                    else str(instance.status)
                )

                if status_str == WhatsAppStatus.CONNECTED.value:
                    chats_result = await whatsapp_bridge.list_chats(session_id=instance.session_name)
                    if chats_result.get("success"):
                        chats = chats_result.get("chats", [])
                        # Usa o numeric_id como índice posicional 1-based na lista ao vivo
                        if 1 <= numeric_id <= len(chats):
                            chat  = chats[numeric_id - 1]
                            phone = chat.get("phone") or chat.get("id", "").split("@")[0]
                            if phone:
                                logger.info(
                                    f"✅ [Resolver] Destinatário via lista de chats do Bridge "
                                    f"(posição {numeric_id}/{len(chats)}): {phone} "
                                    f"— Nome: {chat.get('name', 'N/A')}"
                                )
                                return phone
                        logger.warning(
                            f"⚠️ [Resolver] Índice {numeric_id} fora do range "
                            f"({len(chats)} chats disponíveis no Bridge)."
                        )
                    else:
                        logger.warning(f"⚠️ [Resolver] Bridge retornou erro: {chats_result.get('error')}")
                else:
                    logger.warning(f"⚠️ [Resolver] Bot não conectado ('{status_str}'). Bridge indisponível.")

            except Exception as e:
                logger.error(f"❌ [Resolver] Falha ao consultar Bridge: {e}")

        raise ValueError(
            f"Destinatário não encontrado para conversation_id='{conversation_id}'. "
            f"Formatos aceitos: "
            f"(1) ID de contato ou conversa do banco de dados (ex: '1', '2', '3'), "
            f"(2) JID WhatsApp (ex: '5511999999999@s.whatsapp.net'), "
            f"(3) número de telefone com 10+ dígitos."
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
        # Normaliza o número garantindo que o DDI está presente antes de publicar
        phone_to_send = ChatService.normalize_phone(contact_phone)

        await rabbitmq_bus.publish(
            exchange_name="messages_exchange",
            routing_key="message.outgoing",
            message={
                "tenant_id": tenant_id,
                "agent_id": agent_id,
                "to": phone_to_send,
                "content": content,
                "type": "text"
            }
        )

        logger.info(
            f"✅ Agente {agent_id} → '{phone_to_send}' "
            f"(resolvido de '{raw_conversation_id}', original: '{contact_phone}'): '{content[:60]}'"
        )

        # 3. Sync em tempo real para outras abas/agentes do mesmo Tenant (WebSocket)
        await ws_manager.send_to_conversation(tenant_id, contact_phone, {
            "type": "new_message",
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
