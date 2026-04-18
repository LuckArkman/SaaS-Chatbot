from typing import Optional, Any
from datetime import datetime
from src.models.mongo.flow import SessionStateDocument
from src.services.cache import CacheService
from loguru import logger

class SessionService:
    """
    Gerencia o estado das conversas no MongoDB e Redis.
    Replicando o SessionState Manager do .NET.
    """
    @staticmethod
    async def get_or_create_session(tenant_id: str, contact_phone: str, flow_id: str) -> SessionStateDocument:
        # 1. Tenta buscar no Cache (Redis) — usado apenas para verificar se existe, nunca para rehydratar o documento
        cache_key = f"session:{tenant_id}:{contact_phone}"
        cached_data = await CacheService.get_json(cache_key)
        
        # Se há cache, usa o _id para buscar o documento vivo no MongoDB (evita rehydration inválida)
        if cached_data and cached_data.get("_id"):
            try:
                from beanie import PydanticObjectId
                doc_id = PydanticObjectId(str(cached_data["_id"]))
                session = await SessionStateDocument.get(doc_id)
                if session and not session.is_completed:
                    return session
            except Exception as cache_err:
                logger.warning(f"[Session] Cache hit inválido para {contact_phone} — fallback para MongoDB: {cache_err}")
            
        # 2. Busca no MongoDB (fonte de verdade)
        session = await SessionStateDocument.find_one(
            SessionStateDocument.tenant_id == tenant_id,
            SessionStateDocument.contact_phone == contact_phone,
            SessionStateDocument.is_completed == False
        )
        
        if not session:
            # 3. Cria nova sessão se não existir
            session = SessionStateDocument(
                tenant_id=tenant_id,
                contact_phone=contact_phone,
                flow_id=flow_id,
                current_node_id="start",
                variables={}
            )
            await session.insert()
            logger.info(f"🆕 Nova sessão de chat iniciada: {contact_phone}")
            
        # Atualiza Cache com os dados do documento real
        await CacheService.set_json(cache_key, session.model_dump(mode='json'), expire=1800)  # 30 min
        return session

    @staticmethod
    async def update_session(session: SessionStateDocument):
        """Persiste mudanças no estado no Mongo e invalida/atualiza Cache."""
        session.last_interaction = datetime.utcnow()
        await session.save()
        
        cache_key = f"session:{session.tenant_id}:{session.contact_phone}"
        await CacheService.set_json(cache_key, session.model_dump(mode='json'), expire=1800)
        logger.debug(f"💾 Sessão atualizada para {session.contact_phone}")

    @staticmethod
    async def set_variable(session: SessionStateDocument, key: str, value: Any):
        """Define uma variável na sessão do usuário."""
        session.variables[key] = value
        await SessionService.update_session(session)
