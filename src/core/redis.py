import redis.asyncio as redis
from src.core.config import settings
from loguru import logger

class RedisClient:
    def __init__(self):
        self.url = settings.REDIS_URL
        self._client: redis.Redis = None

    async def connect(self):
        """Estabiliza a conexão assíncrona com o Redis."""
        try:
            self._client = redis.from_url(
                self.url, 
                encoding="utf-8", 
                decode_responses=True
            )
            await self._client.ping()
            logger.info(f"🔌 Conectado ao Redis em {self.url}")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar no Redis: {e}")
            raise

    async def disconnect(self):
        """Fecha a conexão com o Redis."""
        if self._client:
            await self._client.close()
            logger.info("🔌 Conexão Redis encerrada.")

    async def get(self, key: str) -> str:
        return await self._client.get(key)

    async def set(self, key: str, value: str, expire: int = None):
        await self._client.set(key, value, ex=expire)

    async def delete(self, key: str):
        await self._client.delete(key)

    async def exists(self, key: str) -> bool:
        return await self._client.exists(key) > 0

redis_client = RedisClient()
