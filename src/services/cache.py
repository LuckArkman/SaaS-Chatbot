import json
from typing import Any, Optional
from src.core.redis import redis_client

class CacheService:
    @staticmethod
    async def get_json(key: str) -> Optional[Any]:
        """Recupera um objeto JSON do cache e deserializa."""
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    @staticmethod
    async def set_json(key: str, value: Any, expire: int = 3600):
        """Serializa um objeto para JSON e salva no cache."""
        await redis_client.set(key, json.dumps(value), expire=expire)

    @staticmethod
    async def remove(key: str):
        """Remove uma chave do cache."""
        await redis_client.delete(key)
