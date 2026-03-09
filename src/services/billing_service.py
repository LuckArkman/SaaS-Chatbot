from sqlalchemy.orm import Session
from src.models.billing import Plan, Subscription
from loguru import logger
from typing import List, Optional
from datetime import datetime

class BillingService:
    """
    Gerenciador de faturamento e assinaturas.
    Replica a lógica de 'BillingEngine' do .NET.
    """
    @staticmethod
    def list_public_plans(db: Session) -> List[Plan]:
        """Retorna todos os planos ativos disponíveis."""
        return db.query(Plan).filter(Plan.is_active == True).all()

    @staticmethod
    def get_tenant_subscription(db: Session, tenant_id: str) -> Optional[Subscription]:
        """Busca a assinatura atual do Tenant."""
        return db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()

    @staticmethod
    def check_plan_validity(db: Session, tenant_id: str) -> bool:
        """
        Verifica se o plano está ativo e dentro do prazo.
        Grace Period de 3 dias para renovação opcional.
        """
        sub = BillingService.get_tenant_subscription(db, tenant_id)
        if not sub:
            return False # Sem plano (pode ser redirecionado para onboarding)
            
        if sub.status in ["active", "trialing"]:
            if sub.expires_at and sub.expires_at < datetime.utcnow():
                # Plano expirado (TODO: Lógica de Grace Period)
                return False
            return True
            
        return False

    @staticmethod
    def assign_default_plan(db: Session, tenant_id: str):
        """Atribui o plano 'Trial' ou 'Gratuito' para novos tenants."""
        trial_plan = db.query(Plan).filter(Plan.name == "Trial").first()
        
        if not trial_plan:
            # Seed automático do Trial Plan se não existir
            trial_plan = Plan(
                name="Trial",
                description="Plano de Testes - 7 dias",
                price=0.0,
                max_bots=1,
                max_agents=2,
                max_messages_month=500
            )
            db.add(trial_plan)
            db.commit()
            db.refresh(trial_plan)

        new_sub = Subscription(
            tenant_id=tenant_id,
            plan_id=trial_plan.id,
            status="trialing",
            expires_at=None # Expiração configurada dinamicamente se necessário
        )
        db.add(new_sub)
        db.commit()
        logger.info(f"🎁 Plano Trial atribuído ao Tenant {tenant_id}")
