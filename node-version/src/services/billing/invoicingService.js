const { Invoice, Subscription, Transaction } = require('../../models/sql/models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const moment = require('moment');

class InvoicingService {

  static async getUserDashboard(tenantId) {
    const sub = await Subscription.findOne({
      where: { tenant_id: tenantId },
      include: ['Plan']
    });

    const planName = sub && sub.Plan ? sub.Plan.name : 'Nenhum';
    const nextBilling = sub ? sub.expires_at : null;

    const transactions = await Transaction.findAll({
      where: { tenant_id: tenantId, status: 'approved' },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    const openInvoices = await Invoice.findAll({
      where: { tenant_id: tenantId, status: 'open' }
    });

    const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0);

    return {
      current_plan: planName,
      next_billing_date: nextBilling,
      total_spent: totalSpent,
      recent_payments: transactions.map(t => ({
        id: t.id,
        date: t.created_at,
        amount: t.amount,
        status: t.status
      })),
      invoices: openInvoices.map(i => ({
        id: i.id,
        number: i.invoice_number,
        status: i.status,
        amount: i.amount
      }))
    };
  }

  static async generateMonthlyInvoice(tenantId) {
    const sub = await Subscription.findOne({
      where: { tenant_id: tenantId },
      include: ['Plan']
    });

    if (!sub) throw new Error('Tenant sem plano');

    const invoice = await Invoice.create({
      tenant_id: tenantId,
      invoice_number: `INV-${uuidv4().substring(0, 8).toUpperCase()}`,
      period_start: new Date(),
      period_end: moment().add(30, 'days').toDate(),
      amount: sub.Plan.price,
      plan_name: sub.Plan.name,
      status: 'open'
    });

    logger.info(`📄 Fatura gerada: ${invoice.invoice_number} para Tenant ${tenantId}`);
    return invoice;
  }
}

module.exports = InvoicingService;
