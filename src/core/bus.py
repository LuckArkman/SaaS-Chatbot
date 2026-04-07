import aio_pika
import json
from src.core.config import settings
from loguru import logger
from typing import Any, Callable, Awaitable

class RabbitMQBus:
    def __init__(self):
        self.connection: aio_pika.RobustConnection = None
        self.channel: aio_pika.RobustChannel = None
        self.url = settings.RABBITMQ_URL

    async def connect(self):
        """Estabelece conexão robusta com RabbitMQ (Auto-reconnect nativo)."""
        try:
            self.connection = await aio_pika.connect_robust(self.url)
            self.channel = await self.connection.channel()
            logger.info(f"🐰 Conectado ao RabbitMQ em {self.url}")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar no RabbitMQ: {e}")
            raise

    async def disconnect(self):
        """Fecha a conexão com o RabbitMQ."""
        if self.connection:
            await self.connection.close()
            logger.info("🐰 Conexão RabbitMQ encerrada.")

    async def publish(self, exchange_name: str, routing_key: str, message: Any):
        """Publica uma mensagem em uma Exchange com cache de declaração (High-Throughput)."""
        if not self.channel:
            await self.connect()

        # ✅ Otimização: Cache de exchanges evita REDECLARE massivo em cada mensagem (Spring 08 Performance)
        if not hasattr(self, '_exchanges_cache'):
            self._exchanges_cache = {}

        if exchange_name not in self._exchanges_cache:
            exchange = await self.channel.declare_exchange(
                exchange_name, aio_pika.ExchangeType.TOPIC, durable=True
            )
            self._exchanges_cache[exchange_name] = exchange
            logger.debug(f"🐰 Exchange declarada e cacheada: {exchange_name}")
        else:
            exchange = self._exchanges_cache[exchange_name]
        
        message_body = json.dumps(message).encode()
        await exchange.publish(
            aio_pika.Message(
                body=message_body,
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=routing_key
        )
        logger.debug(f"📤 Mensagem enviada para {exchange_name}:{routing_key}")

    async def subscribe(self, queue_name: str, routing_key: str, exchange_name: str, callback: Callable[[Any], Awaitable[None]]):
        """Inscreve um consumidor em uma fila ligada a uma Exchange."""
        exchange = await self.channel.declare_exchange(
            exchange_name, aio_pika.ExchangeType.TOPIC, durable=True
        )
        
        queue = await self.channel.declare_queue(queue_name, durable=True)
        await queue.bind(exchange, routing_key=routing_key)

        async def on_message(message: aio_pika.abc.AbstractIncomingMessage):
            async with message.process():
                try:
                    payload = json.loads(message.body.decode())
                    await callback(payload)
                except Exception as e:
                    logger.error(f"❌ Erro ao processar mensagem da fila {queue_name}: {e}")

        await queue.consume(on_message)
        logger.info(f"📥 Inscrito na fila: {queue_name} (Routing: {routing_key})")

rabbitmq_bus = RabbitMQBus()
