const { Plan, Subscription } = require('../../models/sql/models');
const logger = require('../../utils/logger');

class BillingService {
  
  static async listPublicPlans() {
    return await Plan.findAll({ where: { is_active: true } });
  }

  static async getTenantSubscription(tenantId) {
    return await Subscription.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: Plan }]
    });
  }

  static async checkPlanValidity(tenantId) {
    const sub = await this.getTenantSubscription(tenantId);
    if (!sub) return false;

    if (['active', 'trialing'].includes(sub.status)) {
      if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        // Plano expirado (Grace Period pode ser adicionado aqui)
        return false;
      }
      return true;
    }
    return false;
  }

  static async assignDefaultPlan(tenantId) {
    let trialPlan = await Plan.findOne({ where: { name: 'Trial' } });

    if (!trialPlan) {
      trialPlan = await Plan.create({
        name: 'Trial',
        description: 'Plano de Testes - 7 dias',
        price: 0.0,
        max_bots: 1,
        max_agents: 2,
        max_messages_month: 500
      });
    }

    const newSub = await Subscription.create({
      tenant_id: tenantId,
      plan_id: trialPlan.id,
      status: 'trialing',
      expires_at: null 
    });

    logger.info(`🎁 Plano Trial atribuído ao Tenant ${tenantId}`);
    return newSub;
  }
}

module.exports = BillingService;
