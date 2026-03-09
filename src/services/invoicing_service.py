from sqlalchemy.orm import Session
from src.models.invoice import Invoice
from src.models.billing import Subscription, Plan
from src.models.transaction import Transaction
from datetime import datetime, timedelta
from loguru import logger
from typing import List, Dict, Any
import uuid

class InvoicingService:
    """
    Gerador de Faturas e Dashboards Financeiros.
    Replica a lógica de 'AccountingEngine' do .NET.
    """
    @staticmethod
    def get_user_dashboard(db: Session, tenant_id: str) -> Dict[str, Any]:
        """
        Retorna visão geral financeira para o Tenant.
        """
        # 1. Busca Assinatura Ativa
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        plan_name = sub.plan.name if sub else "Nenhum"
        next_billing = sub.expires_at if sub else None
        
        # 2. Histórico de Pagamentos recentes
        transactions = db.query(Transaction).filter(
            Transaction.tenant_id == tenant_id,
            Transaction.status == "approved"
        ).order_by(Transaction.created_at.desc()).limit(5).all()
        
        # 3. Faturas em Aberto
        open_invoices = db.query(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.status == "open"
        ).all()
        
        return {
            "current_plan": plan_name,
            "next_billing_date": next_billing,
            "total_spent": sum(t.amount for t in transactions),
            "recent_payments": [
                {"id": t.id, "date": t.created_at, "amount": t.amount, "status": t.status}
                for t in transactions
            ],
            "invoices": [
                {"id": i.id, "number": i.invoice_number, "status": i.status, "amount": i.amount}
                for i in open_invoices
            ]
        }

    @staticmethod
    def generate_monthly_invoice(db: Session, tenant_id: str) -> Invoice:
        """Gera uma nova fatura (Draft) para o ciclo atual (Sprint 34)."""
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        if not sub: raise Exception("Tenant sem plano")
        
        invoice = Invoice(
            tenant_id=tenant_id,
            invoice_number=f"INV-{str(uuid.uuid4())[:8].upper()}",
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            amount=sub.plan.price,
            plan_name=sub.plan.name,
            status="open"
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        logger.info(f"📄 Fatura gerada: {invoice.invoice_number} para Tenant {tenant_id}")
        return invoice
