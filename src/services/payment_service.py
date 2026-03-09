from sqlalchemy.orm import Session
from src.models.billing import Plan, Subscription
from src.models.transaction import Transaction
from datetime import datetime, timedelta
from loguru import logger
from typing import Dict, Any, Optional

class PaymentService:
    """
    Motor de Pagamentos e Webhooks Financeiros.
    Replica o 'PaymentEngine' do .NET integrado com Mercado Pago/Stripe.
    """
    @staticmethod
    async def generate_checkout(db: Session, tenant_id: str, plan_id: int) -> Dict[str, Any]:
        """
        Simula a geração de um link de pagamento (Stripe) ou Pix (Mercado Pago).
        Substitui integrações de SDKs .NET por endpoints REST.
        """
        plan = db.query(Plan).get(plan_id)
        if not plan:
            return {"error": "Plano inválido"}
            
        # 🟢 Simulação de Chamada a Gateway (MP/Stripe/Asaas)
        # Em PROD, aqui você executaria: httpx.post(MP_API_URL, json=payload)
        external_id = f"PAY-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Registra transação pendente no Postgres
        transaction = Transaction(
            tenant_id=tenant_id,
            external_id=external_id,
            provider="mercadopago",
            amount=plan.price,
            status="pending",
            payment_method="pix"
        )
        db.add(transaction)
        db.commit()
        
        logger.info(f"💸 Checkout gerado para Tenant {tenant_id} (Valor: {plan.price})")
        
        return {
            "external_id": external_id,
            "checkout_url": f"https://payment.provider.com/checkout/{external_id}",
            "pix_code": "00020126580014BR.GOV.BCB.PIX..." # Payload Pix fictício
        }

    @staticmethod
    def process_webhook(db: Session, provider: str, payload: Dict[str, Any]) -> bool:
        """
        Processa notificações de pagamento (Webhooks).
        Garante que a assinatura seja renovada se o pagamento for aprovado.
        """
        # Exemplo de extração MP
        external_id = payload.get("data", {}).get("id") or payload.get("id")
        status = payload.get("status") # Ex: 'approved'
        
        if not external_id:
            return False
            
        transaction = db.query(Transaction).filter(Transaction.external_id == str(external_id)).first()
        
        if not transaction:
            logger.warning(f"⚠️ Webhook recebido para transação desconhecida: {external_id}")
            return False
            
        # 🟢 Fluxo de Aprovação (Sprint 32)
        if status in ["approved", "succeeded", "paid"]:
            transaction.status = "approved"
            
            # 🔄 Renovar Assinatura
            sub = db.query(Subscription).filter(Subscription.tenant_id == transaction.tenant_id).first()
            if sub:
                sub.status = "active"
                sub.last_billing_date = datetime.utcnow()
                # Adiciona um ciclo (Ex: 30 dias)
                if not sub.expires_at or sub.expires_at < datetime.utcnow():
                    sub.expires_at = datetime.utcnow() + timedelta(days=30)
                else:
                    sub.expires_at += timedelta(days=30)
                
                logger.success(f"💰 Assinatura do Tenant {transaction.tenant_id} RENOVADA com sucesso.")
            
            db.commit()
            return True
            
        return False
