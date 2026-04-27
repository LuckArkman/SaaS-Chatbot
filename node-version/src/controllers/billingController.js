const BillingService = require('../services/billing/billingService');
const InvoicingService = require('../services/billing/invoicingService');
const PaymentService = require('../services/billing/paymentService');

const listPlans = async (req, res) => {
  const plans = await BillingService.listPublicPlans();
  res.json(plans);
};

const getDashboard = async (req, res) => {
  const dashboard = await InvoicingService.getUserDashboard(req.tenantId);
  res.json(dashboard);
};

const createCheckout = async (req, res) => {
  const { plan_id } = req.body;
  const checkout = await PaymentService.generateCheckout(req.tenantId, plan_id);
  res.json(checkout);
};

const handleWebhook = async (req, res) => {
  // Webhooks geralmente vem do Gateway sem autenticação de Tenant, 
  // o webhook lida buscando pelo external_id
  const success = await PaymentService.processWebhook('mercadopago', req.body);
  if (success) {
    return res.status(200).send('OK');
  }
  return res.status(400).send('Bad Request');
};

module.exports = { listPlans, getDashboard, createCheckout, handleWebhook };
