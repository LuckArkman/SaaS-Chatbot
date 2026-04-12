from src.core.bus import rabbitmq_bus
from src.core.ws import ws_manager
from loguru import logger
import asyncio

async def start_websocket_bridge():
    """
    Task de segundo plano que escuta eventos do RabbitMQ e repassa
    para as sessoes de WebSocket (SignalR-like Bridge).
    """
    logger.info("🌉 Iniciando Bridge RabbitMQ -> WebSockets...")

    async def process_outgoing_message(payload: dict):
        """
        Recebe o envelope do RabbitMQ e entrega via WebSocket ao frontend.

        O payload publicado via publish_event tem a estrutura:
          { "tenant_id": "...", "user_id": "...", "data": { "method": "...", "params": {...} } }

        O frontend SEMPRE espera o envelope padrao:
          { "type": "...", "conversation_id": "...", "data": { "method": "...", "params": {...} } }

        Esta funcao garante que o envelope correto seja construido antes de qualquer
        envio ao WebSocket, independente do caller (ack_worker, outgoing_worker, etc.).
        """
        tenant_id = payload.get("tenant_id")
        user_id   = payload.get("user_id")
        data      = payload.get("data")

        if not tenant_id or not data:
            logger.warning(
                f"[Bridge] Payload invalido ignorado: "
                f"tenant={tenant_id}, data={'presente' if data else 'ausente'}"
            )
            return

        # ── Constroi o envelope padrao esperado pelo frontend ─────────────────
        # O campo 'data' contem { method, params } (ou { type, ... } para eventos de sistema).
        # Extraimos o conversation_id de params quando disponivel para que o frontend
        # consiga ancorar a atualizacao ao chat correto sem precisar fazer lookup.
        params          = data.get("params", {}) if isinstance(data, dict) else {}
        conversation_id = str(params.get("conversation_id", ""))

        # Tipo do evento: usa "type" do data se existir (eventos de sistema),
        # caso contrario usa "conversation_update" como padrao RPC.
        event_type = (
            data.get("type", "conversation_update")
            if isinstance(data, dict)
            else "conversation_update"
        )

        envelope = {
            "type":            event_type,
            "conversation_id": conversation_id,
            "data":            data,
        }

        logger.debug(
            f"[Bridge] 📡 Entregando | tenant='{tenant_id}' | type='{event_type}' "
            f"| conv='{conversation_id}' | user={user_id or 'broadcast'}"
        )

        if user_id:
            # Envio Direcionado (Unicast) — ex: resposta de RPC a um agente especifico
            await ws_manager.send_personal_message(tenant_id, user_id, envelope)
        else:
            # Broadcast para todos os agentes do Tenant
            await ws_manager.broadcast_to_tenant(tenant_id, envelope)

    import uuid
    try:
        unique_queue_name = f"outgoing_ws_queue_{uuid.uuid4().hex[:8]}"

        await rabbitmq_bus.subscribe(
            queue_name=unique_queue_name,
            routing_key="ws.broadcast.#",
            exchange_name="messages_exchange",
            callback=process_outgoing_message,
            auto_delete=True,
            exclusive=True
        )
        logger.info(f"🌉 Bridge RabbitMQ→WS ativa | fila='{unique_queue_name}'")
    except Exception as e:
        logger.error(f"❌ Falha critica ao iniciar bridge RabbitMQ-WS: {e}")
