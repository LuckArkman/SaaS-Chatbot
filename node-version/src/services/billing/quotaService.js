const { Subscription, WhatsAppInstance, User } = require('../../models/sql/models');
const redisClient = require('../../config/redis');
const logger = require('../../utils/logger');
const moment = require('moment');

class QuotaService {

  static async incrementMessageUsage(tenantId) {
    const sub = await Subscription.findOne({
      where: { tenant_id: tenantId },
      include: ['Plan'],
      ignoreTenant: true
    });

    if (!sub || sub.status !== 'active') return false;

    const monthKey = `usage:${tenantId}:messages:${moment().format('YYYY-MM')}`;
    
    let currentCount = await redisClient.get(monthKey);
    currentCount = currentCount ? parseInt(currentCount) : 0;

    if (currentCount >= sub.Plan.max_messages_month) {
      logger.warn(`🚨 Tenant ${tenantId} atingiu cota de mensagens (${sub.Plan.max_messages_month})`);
      return false;
    }

    await redisClient.incr(monthKey);
    return true;
  }

  static async canCreateBot(tenantId) {
    const sub = await Subscription.findOne({
      where: { tenant_id: tenantId },
      include: ['Plan'],
      ignoreTenant: true
    });
    if (!sub) return false;

    const currentBots = await WhatsAppInstance.count({
      where: { tenant_id: tenantId, is_active: true },
      ignoreTenant: true
    });

    return currentBots < sub.Plan.max_bots;
  }

  static async canCreateAgent(tenantId) {
    const sub = await Subscription.findOne({
      where: { tenant_id: tenantId },
      include: ['Plan'],
      ignoreTenant: true
    });
    if (!sub) return false;

    const currentAgents = await User.count({
      where: { tenant_id: tenantId, is_agent: true },
      ignoreTenant: true
    });

    return currentAgents < sub.Plan.max_agents;
  }
}

module.exports = QuotaService;
