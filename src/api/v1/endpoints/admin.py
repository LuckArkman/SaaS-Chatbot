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

@router.get("/transactions")
def list_all_transactions(
    db: Session = Depends(get_db),
    current_superuser: Any = Depends(deps.get_current_active_superuser)
) -> Any:
    """Lista todas as transações financeiras da plataforma."""
    transactions = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(100).all()
    return [
        {
            "id": t.id,
            "tenant_id": t.tenant_id,
            "external_id": t.external_id,
            "provider": t.provider,
            "amount": t.amount,
            "currency": t.currency,
            "status": t.status,
            "payment_method": t.payment_method,
            "created_at": t.created_at
        } 
        for t in transactions
    ]

@router.post("/system/maintenance")
def toggle_maintenance_mode(
    enabled: bool,
    current_superuser: Any = Depends(deps.get_current_active_superuser)
) -> Any:
    """Simula a ativação do modo de manutenção global."""
    logger.warning(f"🛠️ Modo de Manutenção alterado para: {enabled} por {current_superuser.email}")
    return {"maintenance_mode": enabled}


@router.get("/ws/connections")
def inspect_ws_connections(
    current_superuser: Any = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Diagnóstico em tempo real das conexões WebSocket ativas.

    Retorna o estado do buffer/transport interno de cada socket por Tenant,
    sem realizar nenhuma operação de I/O na conexão.

    Campos por socket:
      - alive:             resultado combinado das 3 camadas de inspeção
      - client_state:      estado Starlette (CONNECTING/CONNECTED/DISCONNECTED)
      - app_state:         estado da aplicação Starlette
      - transport_closing: resultado de asyncio transport.is_closing()
    """
    from src.core.ws import ws_manager

    summary = {}
    for tenant_id, users in ws_manager.active_connections.items():
        total_sockets = sum(len(v) for v in users.values())
        summary[tenant_id] = {
            "total_sockets": total_sockets,
            "users": ws_manager.get_connection_info(tenant_id),
        }

    return {
        "total_tenants_connected": len(summary),
        "connections": summary,
    }
