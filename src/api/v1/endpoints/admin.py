from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.api import deps
from src.core.database import get_db
from src.models.billing import Subscription, Plan
from src.models.transaction import Transaction
from src.models.whatsapp import WhatsAppInstance
from loguru import logger
from sqlalchemy import func

router = APIRouter()

@router.get("/tenants/summary")
def get_global_summary(
    db: Session = Depends(get_db),
    current_superuser: Any = Depends(deps.get_current_active_superuser)
) -> Any:
    """Visão geral global para SuperAdmins (Sprint 41)."""
    
    # 1. Contagem de Tenants Ativos
    total_tenants = db.query(Subscription).filter(Subscription.status == "active").count()
    
    # 2. Faturamento Total (Aprovado)
    total_revenue = db.query(func.sum(Transaction.amount)).filter(Transaction.status == "approved").scalar() or 0
    
    # 3. Saúde do Sistema (Bots)
    total_bots = db.query(WhatsAppInstance).count()
    connected_bots = db.query(WhatsAppInstance).filter(WhatsAppInstance.status == "connected").count()
    
    return {
        "active_subscriptions": total_tenants,
        "total_revenue": total_revenue,
        "system_health": {
            "total_bots": total_bots,
            "connected_bots": connected_bots,
            "uptime_pct": (connected_bots / total_bots * 100) if total_bots > 0 else 100
        }
    }

@router.get("/transactions", response_model=List[Dict])
def list_all_transactions(
    db: Session = Depends(get_db),
    current_superuser: Any = Depends(deps.get_current_active_superuser)
) -> Any:
    """Lista todas as transações financeiras da plataforma."""
    return db.query(Transaction).order_by(Transaction.created_at.desc()).limit(100).all()

@router.post("/system/maintenance")
def toggle_maintenance_mode(
    enabled: bool,
    current_superuser: Any = Depends(deps.get_current_active_superuser)
) -> Any:
    """Simula a ativação do modo de manutenção global."""
    logger.warning(f"🛠️ Modo de Manutenção alterado para: {enabled} por {current_superuser.email}")
    return {"maintenance_mode": enabled}
