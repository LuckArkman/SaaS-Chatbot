from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.services.billing_service import BillingService
from src.services.payment_service import PaymentService
from src.services.invoicing_service import InvoicingService
from src.schemas.billing import PlanOut, SubscriptionOut
from src.api import deps
from src.core.database import get_db
from src.core.tenancy import get_current_tenant_id
from loguru import logger

router = APIRouter()

@router.get("/plans", response_model=List[PlanOut])
def list_public_plans(
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os planos disponíveis para assinatura.
    Replica o endpoint 'Pricing/Plans' do .NET.
    """
    return BillingService.list_public_plans(db)

@router.get("/my-subscription", response_model=SubscriptionOut)
def get_my_subscription(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    Busca os detalhes da assinatura atual do Tenant ativo.
    """
    sub = BillingService.get_tenant_subscription(db, tenant_id)
    if not sub:
        raise HTTPException(
            status_code=404, 
            detail="No active subscription found for this tenant."
        )
    return sub

@router.post("/subscribe/{plan_id}", response_model=SubscriptionOut)
def subscribe_to_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """
    Inicia uma nova assinatura para o Tenant.
    No futuro, isto integrará com Stripe/PagSeguro (Sprint 32).
    """
    from src.models.billing import Subscription, Plan
    from datetime import datetime
    
    # 1. Busca Plano
    plan = db.get(Plan, plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found or inactive")
        
    # 2. Busca ou Cria Assinatura
    sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
    
    if sub:
        sub.plan_id = plan.id
        sub.status = "active"
        sub.started_at = datetime.utcnow()
    else:
        sub = Subscription(
            tenant_id=tenant_id,
            plan_id=plan.id,
            status="active"
        )
        db.add(sub)
    
    db.commit()
    db.refresh(sub)
    logger.info(f"💳 Tenant {tenant_id} assinou o plano {plan.name}")
    return sub

@router.post("/checkout/{plan_id}")
async def create_checkout_endpoint(
    plan_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Gera o checkout de pagamento (Sprint 32)."""
    return await PaymentService.generate_checkout(db, tenant_id, plan_id)

from fastapi import Request

@router.post("/webhook/{provider}", status_code=status.HTTP_200_OK)
async def payment_webhook_endpoint(
    provider: str,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """Receptor global de notificações de pagamento protegido por HMAC/Auth."""
    logger.debug(f"🔔 Notificação Financeira recebida de {provider}: {payload}")
    
    success = PaymentService.process_webhook(db, provider, request, payload)
    if not success:
        return {"status": "ignored"}
        
    return {"status": "success"}

@router.get("/dashboard")
def get_financial_dashboard(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Retorna o painel financeiro consolidado do Tenant (Sprint 34)."""
    return InvoicingService.get_user_dashboard(db, tenant_id)
