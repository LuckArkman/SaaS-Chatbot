"""
NodeActions — Executores de cada tipo de nó do FluxoBot.

ARQUITETURA DE ENTREGA DE MENSAGENS DO BOT:
  Mensagens enviadas pelo bot vão DIRETAMENTE para o Bridge HTTP (Baileys),
  sem passar por RabbitMQ. Isso elimina o gargalo que travava a background task,
  que bloqueava o WebhookQueue do Baileys (sequencial com timeout de 20s),
  fazendo com que mensagens subsequentes do contato fossem descartadas.

  RabbitMQ permanece apenas para:
  - Handover notifications (baixa frequência, não crítico para entrega)
  - ACK tracking (via gateway, separado do fluxo principal)
"""

import httpx
from typing import Any, Dict, List, Optional
from src.schemas.flow import FlowNode, NodeType
from src.common.schemas import UnifiedMessage, UnifiedMessageType
from src.services.condition_evaluator import ConditionEvaluator
from src.services.message_history_service import MessageHistoryService
from src.models.chat import MessageSide
from src.core.database import SessionLocal
from src.core.config import settings
from loguru import logger
from datetime import datetime


# ─── Envio Direto ao Bridge (sem RabbitMQ) ──────────────────────────────────
async def _send_via_bridge(tenant_id: str, contact_phone: str, content: str) -> bool:
    """
    Envia mensagem diretamente ao Bridge Baileys via HTTP.
    Retorna True se entregue com sucesso, False caso contrário.

    Esta função substitui rabbitmq_bus.publish('message.outgoing') para eliminar
    o gargalo que travava o background task e causava perda de mensagens subsequentes.
    """
    # Resolve a sessão ativa do tenant para envio
    try:
        from src.models.whatsapp import WhatsAppInstance
        with SessionLocal() as db:
            instance = (
                db.query(WhatsAppInstance)
                .filter(WhatsAppInstance.tenant_id == tenant_id, WhatsAppInstance.is_active == True)
                .order_by(WhatsAppInstance.id.desc())
                .execution_options(ignore_tenant=True)
                .first()
            )
            session_id = instance.session_name if instance else f"tenant_{tenant_id}"
    except Exception as e:
        logger.error(f"[NodeActions] ❌ Falha ao resolver sessão para envio: {e}")
        session_id = f"tenant_{tenant_id}"

    bridge_url = getattr(settings, "WHATSAPP_BRIDGE_URL", "http://localhost:4000")
    endpoint = f"{bridge_url}/instance/sendMessage"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                endpoint,
                json={"sessionId": session_id, "to": contact_phone, "content": content},
            )
            if response.status_code == 200:
                logger.info(f"[NodeActions] ✅ Mensagem enviada via Bridge → {contact_phone}")
                return True
            else:
                logger.error(
                    f"[NodeActions] ❌ Bridge retornou {response.status_code} para {contact_phone}: {response.text}"
                )
                return False
    except Exception as e:
        logger.error(f"[NodeActions] ❌ Falha ao enviar via Bridge para {contact_phone}: {e}")
        return False


class NodeActions:
    """
    Biblioteca de funções executoras para cada tipo de nó.
    Replica o comportamento de 'NodeHandlers' do .NET.
    """

    @staticmethod
    async def execute_message_node(
        node: FlowNode, tenant_id: str, contact_phone: str, variables: Dict[str, Any]
    ):
        """Executa um nó de envio de mensagem de texto e persiste no histórico."""
        raw_text = node.data.get("text", "")
        processed_text = ConditionEvaluator.inject_variables(raw_text, variables)

        # Persistência no histórico (Postgres + MongoDB)
        with SessionLocal() as db:
            from src.models.whatsapp import WhatsAppInstance
            instance = (
                db.query(WhatsAppInstance)
                .filter(WhatsAppInstance.tenant_id == tenant_id, WhatsAppInstance.is_active == True)
                .order_by(WhatsAppInstance.id.desc())
                .execution_options(ignore_tenant=True)
                .first()
            )
            actual_session = instance.session_name if instance else f"tenant_{tenant_id}"

        await MessageHistoryService.record_message(
            contact_phone=contact_phone,
            content=processed_text,
            side=MessageSide.BOT,
            session_name=actual_session,
        )

        # Entrega direta via Bridge (sem RabbitMQ — elimina gargalo de mensagens perdidas)
        await _send_via_bridge(tenant_id, contact_phone, processed_text)

    @staticmethod
    async def execute_api_call_node(
        node: FlowNode, variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executa uma chamada HTTP para API externa.
        Similar ao IHttpClientFactory + Polly no .NET.
        """
        url = node.data.get("url")
        method = node.data.get("method", "GET")
        headers = node.data.get("headers", {})
        body = node.data.get("body", {})

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    json=body if method != "GET" else None,
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"❌ Falha na API Call do Nó {node.id}: {e}")
                return {"error": str(e)}

    @staticmethod
    async def execute_handover_node(tenant_id: str, contact_phone: str):
        """Transfere o atendimento para um agente humano."""
        from src.core.bus import rabbitmq_bus
        from src.core.ws import ws_manager
        from src.models.user import User
        from src.core.redis import redis_client

        # Busca agente disponível pelo tenant (sem precisar de objeto Conversation)
        agent = None
        try:
            with SessionLocal() as db:
                agents = db.query(User).filter(
                    User.tenant_id == tenant_id,
                    User.is_agent == True,
                    User.is_active == True,
                ).all()
                for candidate in agents:
                    is_online = await redis_client.get(f"presence:{tenant_id}:{candidate.id}")
                    if is_online and candidate.current_chats_count < candidate.max_concurrent_chats:
                        candidate.current_chats_count += 1
                        db.commit()
                        agent = candidate
                        break
        except Exception as pg_err:
            logger.warning(f"[NodeActions] ⚠️ Falha ao buscar agente no Postgres: {pg_err}")

        # Notificação de handover via RabbitMQ (baixa frequência, aceitável aqui)
        try:
            await rabbitmq_bus.publish(
                exchange_name="messages_exchange",
                routing_key="chat.handover",
                message={
                    "tenant_id": tenant_id,
                    "contact_phone": contact_phone,
                    "assigned_agent_id": agent.id if agent else None,
                    "timestamp": str(datetime.utcnow()),
                },
            )
        except Exception as rmq_err:
            logger.warning(f"[NodeActions] ⚠️ Falha ao publicar handover no RabbitMQ (não crítico): {rmq_err}")

        # Notifica Front-end via WebSocket
        await ws_manager.broadcast_to_tenant(tenant_id, {
            "type": "chat_assigned",
            "contact_phone": contact_phone,
            "agent_id": agent.id if agent else None,
        })

    @staticmethod
    async def execute_ai_node(
        node: FlowNode,
        tenant_id: str,
        contact_phone: str,
        variables: Dict[str, Any],
        user_input: str,
    ):
        """
        Executa um nó de IA usando o Google Gemini.
        O system_prompt pode ser configurado no campo 'data' do nó no FlowBuilder.
        """
        from src.services.gemini_service import GeminiService

        system_prompt = node.data.get(
            "system_prompt", "Você é um assistente virtual prestativo e simpático."
        )

        # Busca histórico recente para contexto multi-turn (MongoDB — sem Postgres)
        recent_messages = await MessageHistoryService.get_recent_messages(
            contact_phone=contact_phone, limit=10
        )

        conversation_history = GeminiService.build_history_from_messages(
            [{"side": m.side, "content": m.content} for m in recent_messages]
        )

        processed_input = ConditionEvaluator.inject_variables(user_input, variables)

        logger.info(
            f"🧠 Gemini: processando input de {contact_phone} "
            f"(histórico: {len(conversation_history)} turns)"
        )

        ai_reply = await GeminiService.generate_response(
            user_message=processed_input,
            system_prompt=system_prompt,
            conversation_history=conversation_history,
        )

        # Persiste a resposta do bot no histórico exclusivamente no MongoDB
        await MessageHistoryService.record_message(
            contact_phone=contact_phone,
            content=ai_reply,
            side=MessageSide.BOT,
            session_name=f"tenant_{tenant_id}",
        )

        # Entrega direta via Bridge (sem RabbitMQ — mesmo padrão do execute_message_node)
        await _send_via_bridge(tenant_id, contact_phone, ai_reply)
        logger.info(f"✅ Resposta Gemini enviada para {contact_phone}: '{ai_reply[:80]}...'")
