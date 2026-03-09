from sqlalchemy.orm import Session
from src.models.billing import Subscription
from src.services.invoicing_service import InvoicingService
from datetime import datetime, timedelta
from loguru import logger

class BillingNotificationService:
    """
    Controlador de Retenção e Alertas de Faturamento.
    Replica o 'SubscriptionGuard' do .NET.
    """
    @staticmethod
    async def process_billing_heartbeat(db: Session):
        """
        Varredura periódica para gerenciar o ciclo de vida das assinaturas.
        Executado via background task no main.py.
        """
        now = datetime.utcnow()
        
        # 🟢 1. Alertas de Pré-Vencimento (3 dias antes)
        three_days_warning = now + timedelta(days=3)
        subs_to_warn = db.query(Subscription).filter(
            Subscription.expires_at <= three_days_warning,
            Subscription.expires_at > now,
            Subscription.status == "active"
        ).all()
        
        for sub in subs_to_warn:
            # TODO: Enviar WhatsApp/Email real via NotificationService
            logger.info(f"⏰ Alerta de Vencimento enviado para Tenant {sub.tenant_id} (Expira em: {sub.expires_at})")

        # 🟢 2. Suspensão Automática (Expirados)
        expired_subs = db.query(Subscription).filter(
            Subscription.expires_at < now,
            Subscription.status == "active"
        ).all()
        
        for sub in expired_subs:
            sub.status = "past_due"
            logger.warning(f"🚫 Tenant {sub.tenant_id} suspenso por expiração de plano.")
            
            # Gera a fatura do novo ciclo para o cliente pagar e reativar
            InvoicingService.generate_monthly_invoice(db, sub.tenant_id)
            
        db.commit()
