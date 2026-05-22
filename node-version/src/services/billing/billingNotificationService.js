const { Subscription } = require('../../models/sql/models');
const InvoicingService = require('./invoicingService');
const logger = require('../../utils/logger');
const moment = require('moment');
const { Op } = require('sequelize');

class BillingNotificationService {
  
  static async processBillingHeartbeat() {
    const now = moment();

    // 1. Alerta de Vencimento
    const threeDaysWarning = moment().add(3, 'days');
    
    // Ignora Tenancy pois é um Cron global
    const subsToWarn = await Subscription.findAll({
      where: {
        expires_at: {
          [Op.lte]: threeDaysWarning.toDate(),
          [Op.gt]: now.toDate()
        },
        status: 'active'
      },
      ignoreTenant: true
    });

    for (const sub of subsToWarn) {
      logger.info(`⏰ Alerta de Vencimento enviado para Tenant ${sub.tenant_id} (Expira em: ${sub.expires_at})`);
    }

    // 2. Suspensão Automática
    const expiredSubs = await Subscription.findAll({
      where: {
        expires_at: { [Op.lt]: now.toDate() },
        status: 'active'
      },
      ignoreTenant: true
    });

    for (const sub of expiredSubs) {
      sub.status = 'past_due';
      await sub.save({ ignoreTenant: true });
      logger.warn(`🚫 Tenant ${sub.tenant_id} suspenso por expiração de plano.`);
      
      try {
        await InvoicingService.generateMonthlyInvoice(sub.tenant_id);
      } catch(e) {
        logger.error(`Falha ao gerar fatura pós suspensão: ${e.message}`);
      }
    }
  }
}

module.exports = BillingNotificationService;
