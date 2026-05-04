const express = require('express');
const { incomingWebhook } = require('./controllers/gatewayController');
const { requireAuth } = require('./middlewares/authMiddleware');
const { validatePhoneContract } = require('./middlewares/contractMiddleware');
const callsController = require('./controllers/callsController');

// Carrega os controllers com os stubs para as rotas ausentes
const { 
  authController, 
  botController, 
  contactsController, 
  chatController, 
  flowsController, 
  adminController, 
  campaignsController, 
  billingController 
} = require('./controllers/stubManager');
const aiController = require('./controllers/aiController');

const router = express.Router();

router.post('/v1/gateway/:channel_type', incomingWebhook);

/**
 * @swagger
 * tags:
 *   - name: auth
 *   - name: admin
 *   - name: calls
 *   - name: ws
 *   - name: RPC-WebSocket
 *   - name: gateway
 *   - name: flows
 *   - name: chat
 *   - name: bot
 *   - name: billing
 *   - name: campaigns
 *   - name: contacts
 */

// ==========================================
// 1. AUTH
// ==========================================
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login Access Token
 *     tags: [auth]
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/auth/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [auth]
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/auth/refresh', authController.refresh);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register User
 *     tags: [auth]
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/auth/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/password-recovery/{email}:
 *   post:
 *     summary: Recover Password
 *     tags: [auth]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/auth/password-recovery/:email', authController.passwordRecovery);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset Password
 *     tags: [auth]
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/auth/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change Password
 *     tags: [auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/auth/change-password', requireAuth, authController.changePassword);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Read User Me
 *     tags: [auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/auth/me', requireAuth, authController.getMe);


// ==========================================
// 2. GATEWAY
// ==========================================
/**
 * @swagger
 * /api/v1/gateway/webhook/{channel_type}:
 *   post:
 *     summary: Incoming Webhook
 *     tags: [gateway]
 *     parameters:
 *       - in: path
 *         name: channel_type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/gateway/webhook/:channel_type', incomingWebhook);


// ==========================================
// 3. FLOWS
// ==========================================
/**
 * @swagger
 * /api/v1/flows/:
 *   get:
 *     summary: List Flows
 *     tags: [flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create Flow
 *     tags: [flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/flows/', requireAuth, flowsController.getFlow);
router.post('/v1/flows/', requireAuth, flowsController.saveFlow);

/**
 * @swagger
 * /api/v1/flows/{flow_id}:
 *   get:
 *     summary: Get Flow
 *     tags: [flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flow_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *   patch:
 *     summary: Update Flow
 *     tags: [flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flow_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     summary: Delete Flow
 *     tags: [flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flow_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/flows/:flow_id', requireAuth, flowsController.getFlowById);
router.patch('/v1/flows/:flow_id', requireAuth, flowsController.updateFlow);
router.delete('/v1/flows/:flow_id', requireAuth, flowsController.deleteFlow);


// ==========================================
// 4. CHAT
// ==========================================
/**
 * @swagger
 * /api/v1/chat/send:
 *   post:
 *     summary: Send Message
 *     tags: [chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/chat/send', requireAuth, validatePhoneContract, chatController.sendManualMessage);

/**
 * @swagger
 * /api/v1/chat/typing:
 *   post:
 *     summary: Update Typing
 *     tags: [chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/chat/typing', requireAuth, chatController.updateTyping);

/**
 * @swagger
 * /api/v1/chat/history/{conversation_id}:
 *   get:
 *     summary: List Chat History
 *     tags: [chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/chat/history/:conversation_id', requireAuth, chatController.getChatHistory);

/**
 * @swagger
 * /api/v1/chat/transfer/{conversation_id}:
 *   post:
 *     summary: Transfer Chat Endpoint
 *     tags: [chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/chat/transfer/:conversation_id', requireAuth, chatController.transferChat);

/**
 * @swagger
 * /api/v1/chat/presence/{user_id}:
 *   get:
 *     summary: Get Agent Presence
 *     tags: [chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/chat/presence/:user_id', requireAuth, chatController.getPresence);

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   get:
 *     summary: List Conversations
 *     tags: [chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/chat/conversations', requireAuth, chatController.listConversations);

/**
 * @swagger
 * /api/v1/chat/conversations/{conversation_id}:
 *   get:
 *     summary: Get Conversation History
 *     tags: [chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/chat/conversations/:conversation_id', requireAuth, chatController.getConversation);


// ==========================================
// 5. BOT
// ==========================================
/**
 * @swagger
 * /api/v1/bot/:
 *   get:
 *     summary: Get Bot Status
 *     tags: [bot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/bot/', requireAuth, botController.getStatus);

/**
 * @swagger
 * /api/v1/bot/qr:
 *   get:
 *     summary: Get Bot Qr
 *     tags: [bot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/bot/qr', requireAuth, botController.getQrStream);

/**
 * @swagger
 * /api/v1/bot/start:
 *   post:
 *     summary: Start Bot
 *     tags: [bot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/bot/start', requireAuth, botController.startBot);

/**
 * @swagger
 * /api/v1/bot/stop:
 *   post:
 *     summary: Stop Bot
 *     tags: [bot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/bot/stop', requireAuth, botController.stopBot);

/**
 * @swagger
 * /api/v1/bot/restart:
 *   post:
 *     summary: Restart Bot
 *     tags: [bot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/bot/restart', requireAuth, botController.restartBot);

/**
 * @swagger
 * /api/v1/bot/logout:
 *   delete:
 *     summary: Logout Bot
 *     tags: [bot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.delete('/v1/bot/logout', requireAuth, botController.logoutBot);


// ==========================================
// 6. BILLING
// ==========================================
/**
 * @swagger
 * /api/v1/billing/plans:
 *   get:
 *     summary: List Public Plans
 *     tags: [billing]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/billing/plans', billingController.listPlans);

/**
 * @swagger
 * /api/v1/billing/my-subscription:
 *   get:
 *     summary: Get My Subscription
 *     tags: [billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/billing/my-subscription', requireAuth, billingController.getMySubscription);

/**
 * @swagger
 * /api/v1/billing/subscribe/{plan_id}:
 *   post:
 *     summary: Subscribe To Plan
 *     tags: [billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: plan_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/billing/subscribe/:plan_id', requireAuth, billingController.subscribeToPlan);

/**
 * @swagger
 * /api/v1/billing/checkout/{plan_id}:
 *   post:
 *     summary: Create Checkout Endpoint
 *     tags: [billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: plan_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/billing/checkout/:plan_id', requireAuth, billingController.createCheckout);

/**
 * @swagger
 * /api/v1/billing/webhook/{provider}:
 *   post:
 *     summary: Payment Webhook Endpoint
 *     tags: [billing]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/billing/webhook/:provider', billingController.handleWebhook);

/**
 * @swagger
 * /api/v1/billing/dashboard:
 *   get:
 *     summary: Get Financial Dashboard
 *     tags: [billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/billing/dashboard', requireAuth, billingController.getDashboard);


// ==========================================
// 7. CAMPAIGNS
// ==========================================
/**
 * @swagger
 * /api/v1/campaigns/:
 *   get:
 *     summary: List Campaigns
 *     tags: [campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create Campaign
 *     tags: [campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/campaigns/', requireAuth, campaignsController.listCampaigns);
router.post('/v1/campaigns/', requireAuth, campaignsController.createCampaign);

/**
 * @swagger
 * /api/v1/campaigns/{campaign_id}/schedule:
 *   post:
 *     summary: Schedule Campaign Endpoint
 *     tags: [campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaign_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/campaigns/:id/schedule', requireAuth, campaignsController.scheduleCampaign);

/**
 * @swagger
 * /api/v1/campaigns/{campaign_id}/pause:
 *   post:
 *     summary: Pause Campaign Endpoint
 *     tags: [campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaign_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/campaigns/:id/pause', requireAuth, campaignsController.pauseCampaign);


// ==========================================
// 8. CONTACTS
// ==========================================
/**
 * @swagger
 * /api/v1/contacts/:
 *   get:
 *     summary: List Contacts
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create Contact
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/contacts/', requireAuth, contactsController.listContacts);
router.post('/v1/contacts/', requireAuth, validatePhoneContract, contactsController.createContact);

/**
 * @swagger
 * /api/v1/contacts/import:
 *   post:
 *     summary: Import Contacts From File
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/contacts/import', requireAuth, contactsController.importContacts);

/**
 * @swagger
 * /api/v1/contacts/{phone}/opt-out:
 *   post:
 *     summary: Set Opt Out
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/contacts/:phone/opt-out', requireAuth, contactsController.optOutContact);

/**
 * @swagger
 * /api/v1/contacts/tags:
 *   get:
 *     summary: List Tags
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/contacts/tags', requireAuth, contactsController.listTags);

/**
 * @swagger
 * /api/v1/contacts/whatsapp:
 *   get:
 *     summary: Listar contatos do WhatsApp do agente
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Adicionar contato ao WhatsApp do agente
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/contacts/whatsapp', requireAuth, contactsController.listWhatsappContacts);
router.post('/v1/contacts/whatsapp', requireAuth, contactsController.addWhatsappContact);

/**
 * @swagger
 * /api/v1/contacts/whatsapp/{phone}:
 *   put:
 *     summary: Editar contato no WhatsApp e no Banco
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     summary: Deletar contato do WhatsApp e do Banco
 *     tags: [contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.put('/v1/contacts/whatsapp/:phone', requireAuth, validatePhoneContract, contactsController.editWhatsappContact);
router.delete('/v1/contacts/whatsapp/:phone', requireAuth, contactsController.deleteWhatsappContact);


// ==========================================
// 9. ADMIN
// ==========================================
/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Estatísticas do SaaS (SuperAdmin)
 *     tags: [admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/admin/stats', requireAuth, adminController.getTenantStats);

/**
 * @swagger
 * /api/v1/admin/tenants/summary:
 *   get:
 *     summary: Get Global Summary
 *     tags: [admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/admin/tenants/summary', requireAuth, adminController.getTenantsSummary);

/**
 * @swagger
 * /api/v1/admin/transactions:
 *   get:
 *     summary: List All Transactions
 *     tags: [admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/admin/transactions', requireAuth, adminController.listTransactions);

/**
 * @swagger
 * /api/v1/admin/system/maintenance:
 *   post:
 *     summary: Toggle Maintenance Mode
 *     tags: [admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/admin/system/maintenance', requireAuth, adminController.toggleMaintenance);

/**
 * @swagger
 * /api/v1/admin/ws/connections:
 *   get:
 *     summary: Inspect Ws Connections
 *     tags: [admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/v1/admin/ws/connections', requireAuth, adminController.inspectWsConnections);


// ==========================================
// 10. CALLS
// ==========================================
/**
 * @swagger
 * /api/v1/calls/start:
 *   post:
 *     summary: Iniciar chamada de voz via WhatsApp
 *     tags: [calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/calls/start', requireAuth, callsController.startCall);

/**
 * @swagger
 * /api/v1/calls/reject:
 *   post:
 *     summary: Rejeitar chamada recebida via WhatsApp
 *     tags: [calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/calls/reject', requireAuth, callsController.rejectCall);

// ==========================================
// 11. WS / RPC (Documentation Only)
// ==========================================
/**
 * @swagger
 * /api/v1/ws/:
 *   get:
 *     summary: Websocket Docs
 *     tags: [ws]
 *     responses:
 *       101:
 *         description: Switching Protocols
 */

/**
 * @swagger
 * /api/v1/ws:
 *   get:
 *     summary: Websocket Docs
 *     tags: [RPC-WebSocket]
 *     responses:
 *       101:
 *         description: Switching Protocols
 */

// ==========================================
// 12. AI & RAG
// ==========================================
/**
 * @swagger
 * /api/v1/ai/config:
 *   get:
 *     summary: Get AI Configuration
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Update AI Configuration (Select Brain Model)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.get('/v1/ai/config', requireAuth, aiController.getConfig);
router.post('/v1/ai/config', requireAuth, aiController.updateConfig);

/**
 * @swagger
 * /api/v1/rag/ingest:
 *   post:
 *     summary: Ingest knowledge into the RAG brain
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/v1/rag/ingest', requireAuth, aiController.ingestKnowledge);

/**
 * @swagger
 * /api/v1/rag/clear:
 *   delete:
 *     summary: Clear tenant knowledge base
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/v1/rag/clear', requireAuth, aiController.clearKnowledge);

module.exports = router;
