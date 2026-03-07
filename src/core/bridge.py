from src.core.bus import rabbitmq_bus
from src.core.ws import ws_manager
from loguru import logger
import json
import asyncio

async def start_websocket_bridge():
    """
    Task de segundo plano que escuta eventos do RabbitMQ e repassa
    para as sessões de WebSocket (SignalR-like Bridge).
    """
    logger.info("🌉 Iniciando Bridge RabbitMQ -> WebSockets...")
    
    async def process_outgoing_message(payload: dict):
        """
        Envia para o usuário correto ou broadcast para o tenant.
        Ex Payload: { "tenant_id": "...", "user_id": "...", "data": { ... } }
        """
        tenant_id = payload.get("tenant_id")
        user_id = payload.get("user_id")
        data = payload.get("data")
        
        if not tenant_id or not data:
            return
            
        if user_id:
            # Envio Direcionado (Unicast)
            await ws_manager.send_personal_message(tenant_id, user_id, data)
        else:
            # Envio em Massa para o Tenant (Broadcast)
            await ws_manager.broadcast_to_tenant(tenant_id, data)

    # Inicia Consumo em Background
    try:
        await rabbitmq_bus.subscribe(
            queue_name="outgoing_ws_queue",
            routing_key="ws.broadcast.#",
            exchange_name="messages_exchange",
            callback=process_outgoing_message
        )
    except Exception as e:
        logger.error(f"❌ Falha crítica ao iniciar bridge RabbitMQ-WS: {e}")
