const { Plan, Subscription, Transaction } = require('../../models/sql/models');
const logger = require('../../utils/logger');
const moment = require('moment');

class PaymentService {
  
  static async generateCheckout(tenantId, planId) {
    const plan = await Plan.findByPk(planId);
    if (!plan) return { error: 'Plano inválido' };

    // Simulação de chamada a Gateway de Pagamento (Stripe/MercadoPago)
    const externalId = `PAY-${moment().format('YYYYMMDDHHmmss')}`;

    await Transaction.create({
      tenant_id: tenantId,
      external_id: externalId,
      provider: 'mercadopago',
      amount: plan.price,
      status: 'pending',
      payment_method: 'pix'
    });

    logger.info(`💸 Checkout gerado para Tenant ${tenantId} (Valor: ${plan.price})`);

    return {
      external_id: externalId,
      checkout_url: `https://payment.provider.com/checkout/${externalId}`,
      pix_code: '00020126580014BR.GOV.BCB.PIX...'
    };
  }

  static async processWebhook(provider, payload) {
    const externalId = payload?.data?.id || payload?.id;
    const status = payload?.status;

    if (!externalId) return false;

    // A transação ignora tenancy pq o webhook não envia token de auth com tenant_id
    const transaction = await Transaction.findOne({ 
      where: { external_id: String(externalId) },
      ignoreTenant: true 
    });

    if (!transaction) {
      logger.warn(`⚠️ Webhook recebido para transação desconhecida: ${externalId}`);
      return false;
    }

    if (['approved', 'succeeded', 'paid'].includes(status)) {
      transaction.status = 'approved';
      await transaction.save({ ignoreTenant: true });

      const sub = await Subscription.findOne({ 
        where: { tenant_id: transaction.tenant_id },
        ignoreTenant: true
      });

      if (sub) {
        sub.status = 'active';
        sub.last_billing_date = new Date();
        
        if (!sub.expires_at || new Date(sub.expires_at) < new Date()) {
          sub.expires_at = moment().add(30, 'days').toDate();
        } else {
          sub.expires_at = moment(sub.expires_at).add(30, 'days').toDate();
        }

        await sub.save({ ignoreTenant: true });
        logger.info(`💰 Assinatura do Tenant ${transaction.tenant_id} RENOVADA com sucesso.`);
      }

      return true;
    }

    return false;
  }
}

module.exports = PaymentService;
