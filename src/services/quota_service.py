from src.models.billing import Subscription, Plan
from src.core.redis import redis_client
from sqlalchemy.orm import Session
from datetime import datetime
from loguru import logger

class QuotaService:
    """
    Gerenciador de limites e quotas (SaaS Governing).
    Controla mensagens enviadas e instâncias de bots por Tenant.
    Replica o 'ResourceGuard' do .NET.
    """
    
    @staticmethod
    async def increment_message_usage(db: Session, tenant_id: str) -> bool:
        """
        Incrementa o contador de mensagens enviadas no mês.
        Retorna False se o limite do plano for atingido.
        """
        # 1. Recupera Plano do Tenant
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        if not sub or sub.status != "active":
            return False
            
        plan = sub.plan
        month_key = f"usage:{tenant_id}:messages:{datetime.utcnow().strftime('%Y-%m')}"
        
        # 2. Verifica Limite no Redis (Caminho Rápido)
        current_count = await redis_client.get(month_key)
        current_count = int(current_count) if current_count else 0
        
        if current_count >= plan.max_messages_month:
            logger.warning(f"🚨 Tenant {tenant_id} atingiu cota de mensagens ({plan.max_messages_month})")
            return False
            
        # 3. Incrementa (Redis Atômico)
        await redis_client.incr(month_key)
        
        # TODO: Persistência assíncrona para Postgres em batch
        return True

    @staticmethod
    def can_create_bot(db: Session, tenant_id: str) -> bool:
        """Verifica se o Tenant ainda pode criar novas instâncias de bot."""
        from src.models.whatsapp import WhatsAppInstance
        
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        if not sub: return False
        
        current_bots = db.query(WhatsAppInstance).filter(
            WhatsAppInstance.tenant_id == tenant_id,
            WhatsAppInstance.is_active == True
        ).count()
        
        return current_bots < sub.plan.max_bots

    @staticmethod
    def can_create_agent(db: Session, tenant_id: str) -> bool:
        """Verifica se o Tenant ainda pode criar novos usuários/agentes."""
        from src.models.user import User
        
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        if not sub: return False
        
        current_agents = db.query(User).filter(
            User.tenant_id == tenant_id,
            User.is_agent == True
        ).count()
        
        return current_agents < sub.plan.max_agents
