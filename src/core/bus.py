"""
Bus de Mensagens Assíncrono — RabbitMQ via aio_pika.

CORREÇÕES APLICADAS:
  1. Cache de exchanges movido para __init__ (thread-safe, sem race condition).
  2. Cache é limpo automaticamente em reconnect(), evitando referências a
     canais mortos que causavam 'Channel closed' silencioso após reconexão.
  3. channel é verificado antes de cada publish — se None ou fechado, reconecta.
  4. Retry com backoff exponencial no publish para cenários de canal instável.
"""

import aio_pika
import json
import asyncio
from src.core.config import settings
from loguru import logger
from typing import Any, Callable, Awaitable


class RabbitMQBus:
    """
    Wrapper sobre aio_pika com reconexão robusta e cache de exchanges.
    Equivalente ao IMessageBroker do .NET.
    """

    def __init__(self):
        self.connection: aio_pika.RobustConnection = None
        self.channel: aio_pika.RobustChannel = None
        self.url = settings.RABBITMQ_URL
        # Cache inicializado no __init__ — nunca causa AttributeError em contexto async
        self._exchanges_cache: dict[str, aio_pika.Exchange] = {}

    async def connect(self, retries: int = 10, delay: int = 5) -> None:
        """
        Estabelece conexão robusta com RabbitMQ com retry e backoff.

        Args:
            retries: Número máximo de tentativas de reconexão.
            delay:   Segundos de espera entre tentativas.

        Raises:
            Exception: Se todas as tentativas falharem.
        """
        for attempt in range(retries):
            try:
                self.connection = await aio_pika.connect_robust(self.url)
                self.channel    = await self.connection.channel()
                # Limpa o cache ao reconectar — os objetos Exchange do canal
                # anterior são inválidos e causariam erros silenciosos de 'Channel closed'
                self._exchanges_cache.clear()
                logger.info(f"🐰 Conectado ao RabbitMQ | url={self.url}")
                return
            except Exception as e:
                logger.warning(f"⏳ RabbitMQ tentativa {attempt + 1}/{retries} falhou: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                else:
                    logger.error("❌ Limite de tentativas de conexão ao RabbitMQ excedido.")
                    raise

    async def disconnect(self) -> None:
        """Fecha graciosamente a conexão com o RabbitMQ."""
        if self.connection:
            try:
                await self.connection.close()
                self._exchanges_cache.clear()
                logger.info("🐰 Conexão RabbitMQ encerrada.")
            except Exception as e:
                logger.warning(f"⚠️ Erro ao fechar conexão RabbitMQ: {e}")

    def _is_channel_open(self) -> bool:
        """Verifica se o canal atual está aberto e utilizável."""
        if not self.channel:
            return False
        # aio_pika.RobustChannel expõe is_closed
        try:
            return not self.channel.is_closed
        except Exception:
            return False

    async def _get_or_declare_exchange(self, exchange_name: str) -> aio_pika.Exchange:
        """
        Retorna a exchange do cache ou a declara no broker.
        Se o canal estiver fechado, reconecta antes de declarar.

        Args:
            exchange_name: Nome da exchange TOPIC durável.

        Returns:
            Instância de aio_pika.Exchange pronta para publicação.
        """
        if not self._is_channel_open():
            logger.warning("[Bus] Canal RabbitMQ fechado — reconectando antes de declarar exchange...")
            await self.connect()

        if exchange_name not in self._exchanges_cache:
            exchange = await self.channel.declare_exchange(
                exchange_name,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )
            self._exchanges_cache[exchange_name] = exchange
            logger.debug(f"🐰 Exchange declarada e cacheada: '{exchange_name}'")

        return self._exchanges_cache[exchange_name]

    async def publish(
        self,
        exchange_name: str,
        routing_key: str,
        message: Any,
        max_retries: int = 3,
    ) -> None:
        """
        Publica uma mensagem em uma Exchange com retry e backoff exponencial.

        Args:
            exchange_name: Nome da exchange de destino.
            routing_key:   Chave de roteamento TOPIC.
            message:       Payload serializável para JSON.
            max_retries:   Tentativas em caso de falha de canal.
        """
        message_body = json.dumps(message, default=str).encode()
        delay = 0.5

        for attempt in range(max_retries):
            try:
                exchange = await self._get_or_declare_exchange(exchange_name)
                await exchange.publish(
                    aio_pika.Message(
                        body=message_body,
                        content_type="application/json",
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    ),
                    routing_key=routing_key,
                )
                logger.debug(f"📤 [{routing_key}] Mensagem publicada em '{exchange_name}'")
                return  # Sucesso

            except Exception as e:
                logger.warning(
                    f"⚠️ [Bus] Falha ao publicar em '{exchange_name}:{routing_key}' "
                    f"(tentativa {attempt + 1}/{max_retries}): {e}"
                )
                # Invalida o cache da exchange — pode estar morta junto com o canal
                self._exchanges_cache.pop(exchange_name, None)

                if attempt < max_retries - 1:
                    await asyncio.sleep(delay)
                    delay *= 2  # Backoff exponencial: 0.5s → 1s → 2s
                else:
                    logger.error(
                        f"❌ [Bus] Falha total ao publicar em '{exchange_name}:{routing_key}'. "
                        f"Mensagem perdida: {str(message)[:200]}"
                    )
                    raise

    async def subscribe(
        self,
        queue_name: str,
        routing_key: str,
        exchange_name: str,
        callback: Callable[[Any], Awaitable[None]],
        auto_delete: bool = False,
        exclusive: bool = False,
        prefetch_count: int = 10,
    ) -> None:
        """
        Inscreve um consumidor em uma fila ligada a uma Exchange TOPIC.

        Args:
            queue_name:     Nome da fila durável.
            routing_key:    Padrão de roteamento TOPIC.
            exchange_name:  Exchange de origem.
            callback:       Coroutine async chamada com o payload deserializado.
            auto_delete:    Se True, fila é removida ao desconectar.
            exclusive:      Se True, fila exclusiva desta conexão.
            prefetch_count: Limite de mensagens processadas simultaneamente (QoS).
        """
        if not self._is_channel_open():
            await self.connect()

        # QoS: limita mensagens em voo para evitar sobrecarga do worker
        await self.channel.set_qos(prefetch_count=prefetch_count)

        exchange = await self.channel.declare_exchange(
            exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )

        queue = await self.channel.declare_queue(
            queue_name,
            durable=not auto_delete,
            auto_delete=auto_delete,
            exclusive=exclusive,
        )
        await queue.bind(exchange, routing_key=routing_key)

        async def on_message(message: aio_pika.abc.AbstractIncomingMessage):
            async with message.process(requeue_on_error=False):
                try:
                    payload = json.loads(message.body.decode())
                    await callback(payload)
                except json.JSONDecodeError as e:
                    logger.error(f"❌ [Bus] Payload inválido na fila '{queue_name}': {e}")
                except Exception as e:
                    logger.error(f"❌ [Bus] Erro ao processar mensagem da fila '{queue_name}': {e}")

        await queue.consume(on_message)
        logger.info(
            f"📥 Inscrito | fila='{queue_name}' | routing='{routing_key}' "
            f"| exchange='{exchange_name}' | prefetch={prefetch_count}"
        )


rabbitmq_bus = RabbitMQBus()
