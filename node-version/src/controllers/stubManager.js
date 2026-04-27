const authController = require('./authController');
const botController = require('./botController');
const contactsController = require('./contactsController');
const chatController = require('./chatController');
const flowsController = require('./flowsController');
const adminController = require('./adminController');
const campaignsController = require('./campaignsController');
const billingController = require('./billingController');

const stub = (req, res) => res.json({ message: 'Migrated to Node.js! Endpoint under construction.' });

// Mock missing controller functions dynamically
const controllers = { authController, botController, contactsController, chatController, flowsController, adminController, campaignsController, billingController };

const missing = {
  authController: ['passwordRecovery', 'resetPassword'],
  flowsController: ['getFlowById', 'updateFlow', 'deleteFlow'],
  chatController: ['updateTyping', 'transferChat', 'getPresence'],
  billingController: ['getMySubscription', 'subscribeToPlan'],
  campaignsController: ['pauseCampaign'],
  contactsController: ['importContacts', 'optOutContact', 'listTags', 'editWhatsappContact', 'deleteWhatsappContact'],
  adminController: ['getTenantsSummary', 'listTransactions', 'toggleMaintenance', 'inspectWsConnections']
};

for (const [ctrl, methods] of Object.entries(missing)) {
  for (const method of methods) {
    if (!controllers[ctrl][method]) {
      controllers[ctrl][method] = stub;
    }
  }
}

module.exports = controllers;
