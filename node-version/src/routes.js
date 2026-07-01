const express = require('express');
const { incomingWebhook } = require('./controllers/gatewayController');
const { requireAuth, requireServiceKey, requireSuperAdmin } = require('./middlewares/authMiddleware');
const { loginRateLimiter } = require('./middlewares/rateLimiterMiddleware');
const sadminController = require('./controllers/adminController');
const { validatePhoneContract } = require('./middlewares/contractMiddleware');
const callsController = require('./controllers/callsController');
const storageController = require('./controllers/storageController');

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

// Rota oculta para testar o sistema global de relatórios de falha
router.post('/v1/force-error', (req, res, next) => {
  const error = new Error('Falha simulada para testar o Error Reporting System.');
  error.status = 500;
  next(error);
});
/**
 * @swagger
 * tags:
 *   - name: auth
 *   - name: sadmin
 *     description: "🔐 Painel Administrativo — requer Bearer token de AdminUser"
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
 *   - name: AI
 */

// ==========================================
// 1. AUTH
// ==========================================

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login (obtém JWT)
 *     description: |
 *       Aceita JSON **ou** `application/x-www-form-urlencoded`.
 *       O campo de e-mail pode ser enviado como `email` ou `username` (compatibilidade OAuth2).
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@hotspot.com
 *               password:
 *                 type: string
 *                 example: Senha@123
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: user@hotspot.com
 *               password:
 *                 type: string
 *                 example: Senha@123
 *     responses:
 *       200:
 *         description: JWT emitido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:  { type: string }
 *                 refresh_token: { type: string }
 *                 token_type:    { type: string, example: bearer }
 *                 tenant_id:     { type: string }
 *                 user_id:       { type: string }
 *       401:
 *         description: Credenciais incorretas
 *       422:
 *         description: Campos obrigatórios em falta
 */
router.post('/v1/auth/login', loginRateLimiter, authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Renovar Access Token via Refresh Token
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Novo par de tokens emitido
 *       401:
 *         description: Refresh token inválido ou expirado
 */
router.post('/v1/auth/refresh', authController.refresh);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Registar utilizador (idempotente, devolve JWT)
 *     description: |
 *       Cria um novo utilizador e devolve um JWT imediatamente (sem necessidade de login separado).
 *       **Comportamento idempotente:**
 *       - E-mail novo → `201` + JWT + `created: true`
 *       - E-mail existe + senha correta → `200` + JWT + `created: false` (funciona como login)
 *       - E-mail existe + senha errada → `409` + `code: PASSWORD_MISMATCH`
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@hotspot.com
 *               password:
 *                 type: string
 *                 example: Senha@123
 *               full_name:
 *                 type: string
 *                 example: João Silva
 *     responses:
 *       201:
 *         description: Utilizador criado com sucesso + JWT
 *       200:
 *         description: E-mail já registado com senha correta — JWT emitido (login idempotente)
 *       409:
 *         description: E-mail já registado com senha diferente
 *       422:
 *         description: Campos inválidos ou senha fraca
 */
router.post('/v1/auth/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/provision:
 *   post:
 *     summary: Provisionamento único para integração Hotspot (requer X-Service-Key)
 *     description: |
 *       **Endpoint exclusivo para sistemas integrados** (Hotspot, painel PHP, etc.).
 *       Protegido pelo header `X-Service-Key` (definido em `PROVISION_API_KEY` no servidor).
 *       Uma única chamada cria o utilizador, faz login ou atualiza a senha — e **sempre devolve JWT**.
 *
 *       | Situação | Status | Extra |
 *       |---|---|---|
 *       | E-mail novo | 201 | `created: true` |
 *       | E-mail existe + senha correta | 200 | `created: false, password_updated: false` |
 *       | E-mail existe + senha errada | 200 | `created: false, password_updated: true` |
 *     tags: [auth]
 *     security:
 *       - serviceKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@hotspot.com
 *               password:
 *                 type: string
 *                 example: pass123
 *               full_name:
 *                 type: string
 *                 example: João Silva
 *               tenant_name:
 *                 type: string
 *                 example: Hotspot Norte
 *     responses:
 *       201:
 *         description: Utilizador criado + JWT
 *       200:
 *         description: JWT emitido (login ou senha atualizada)
 *       401:
 *         description: X-Service-Key inválida ou ausente
 *       422:
 *         description: Campos obrigatórios em falta
 */
router.post('/v1/auth/provision', requireServiceKey, authController.provision);

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

/**
 * @swagger
 * /api/v1/auth/remove:
 *   delete:
 *     summary: Excluir / desactivar a própria conta (requer autenticação e confirmação)
 *     description: |
 *       Permite que o utilizador autenticado solicite a desactivação da sua própria conta.
 *
 *       **Comportamento:**
 *       - A conta é marcada como `is_active: false` imediatamente.
 *       - Todas as sessões WhatsApp activas do tenant são encerradas.
 *       - Os dados históricos (mensagens, conversas) são **preservados por 30 dias** para fins de compliance antes de serem eliminados pelo sistema.
 *       - A eliminação total e imediata dos dados só pode ser realizada por um superadmin via `DELETE /api/v1/sadmin/tenants/{tenant_id}`.
 *
 *       **Medidas de segurança:**
 *       - Requer token JWT válido (`Authorization: Bearer <token>`).
 *       - Requer a **senha actual** no body para prevenir acções acidentais.
 *       - Requer o campo `confirm: "DELETE_MY_ACCOUNT"` para confirmação explícita.
 *     tags: [auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [confirm, password]
 *             properties:
 *               confirm:
 *                 type: string
 *                 enum: [DELETE_MY_ACCOUNT]
 *                 example: DELETE_MY_ACCOUNT
 *                 description: Valor fixo obrigatório para confirmação explícita da acção.
 *               password:
 *                 type: string
 *                 example: MinhaSenh@Actual123
 *                 description: Senha actual do utilizador para validar a identidade.
 *     responses:
 *       200:
 *         description: Conta desactivada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *                 deactivated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Campo confirm ausente ou incorreto
 *       401:
 *         description: Token inválido ou senha incorreta
 *       422:
 *         description: Campo password ausente
 */
router.delete('/v1/auth/remove', requireAuth, authController.deleteMyAccount);


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

/**
 * @swagger
 * /api/v1/admin/users/{email}/password:
 *   patch:
 *     summary: Reset de senha sem fluxo de e-mail (requer X-Service-Key)
 *     description: |
 *       Permite ao painel admin/developer redefinir a senha de qualquer utilizador
 *       sem enviar e-mail de recuperação. Requer o header `X-Service-Key`.
 *     tags: [admin]
 *     security:
 *       - serviceKey: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         example: user@hotspot.com
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_password]
 *             properties:
 *               new_password:
 *                 type: string
 *                 example: NovaSenha@2024
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 email:   { type: string }
 *       401:
 *         description: X-Service-Key inválida
 *       404:
 *         description: Utilizador não encontrado
 */
router.patch('/v1/admin/users/:email/password', requireServiceKey, authController.adminResetPassword);


// ==========================================
// 10. CALLS
// ==========================================
/**
 * @swagger
 * /api/v1/calls/start:
 *   post:
 *     summary: Iniciar chamada de voz/vídeo via WhatsApp
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

/**
 * @swagger
 * /api/v1/calls/accept:
 *   post:
 *     summary: Aceitar chamada recebida via WhatsApp
 *     tags: [calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/calls/accept', requireAuth, callsController.acceptCall);

/**
 * @swagger
 * /api/v1/calls/end:
 *   post:
 *     summary: Encerrar chamada via WhatsApp
 *     tags: [calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/v1/calls/end', requireAuth, callsController.endCall);

// ==========================================
// 10.5. STORAGE
// ==========================================
/**
 * @swagger
 * /api/v1/storage/upload:
 *   post:
 *     summary: Upload de mídias/arquivos
 *     tags: [storage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/v1/storage/upload', requireAuth, storageController.upload.single('file'), storageController.uploadFile);

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

// ============================================================
// 13. SUPER ADMIN — /api/v1/sadmin/*
// Todas as rotas protegidas por requireSuperAdmin().
// Token obtido em POST /api/v1/sadmin/auth/login
// ============================================================

// --- Auth Administrativa ---
/**
 * @swagger
 * /api/v1/sadmin/auth/register:
 *   post:
 *     summary: Registar novo AdminUser (bootstrap ou superadmin)
 *     description: |
 *       Se não existir nenhum admin, qualquer chamada cria o primeiro (superadmin).
 *       Se já existirem admins, requer Bearer token de superadmin.
 *     tags: [sadmin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, full_name]
 *             properties:
 *               email:     { type: string, example: admin@saas.com }
 *               password:  { type: string, example: Admin@1234 }
 *               full_name: { type: string, example: Admin Principal }
 *               role:      { type: string, enum: [superadmin, support, finance, readonly] }
 *     responses:
 *       201: { description: Admin criado }
 *       409: { description: E-mail já registado }
 */
router.post('/v1/sadmin/auth/register', sadminController.registerAdmin);

/**
 * @swagger
 * /api/v1/sadmin/auth/login:
 *   post:
 *     summary: Login administrativo (devolve token de admin)
 *     tags: [sadmin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Token administrativo emitido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token: { type: string }
 *                 token_type:   { type: string }
 *                 role:         { type: string }
 *                 expires_in:   { type: string }
 *       401: { description: Credenciais incorretas }
 */
router.post('/v1/sadmin/auth/login', loginRateLimiter, sadminController.loginAdmin);

/**
 * @swagger
 * /api/v1/sadmin/auth/me:
 *   get:
 *     summary: Perfil do admin autenticado
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Dados do admin }
 */
router.get('/v1/sadmin/auth/me', requireSuperAdmin(), sadminController.getAdminMe);

// --- Gestão de Admins ---
/**
 * @swagger
 * /api/v1/sadmin/admins:
 *   get:
 *     summary: Listar todos os administradores
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Lista de admins }
 */
router.get('/v1/sadmin/admins', requireSuperAdmin('superadmin'), sadminController.listAdmins);

/**
 * @swagger
 * /api/v1/sadmin/admins/{id}:
 *   patch:
 *     summary: Atualizar role ou status de um admin
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:      { type: string, enum: [superadmin, support, finance, readonly] }
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Admin atualizado }
 */
router.patch('/v1/sadmin/admins/:id', requireSuperAdmin('superadmin'), sadminController.updateAdmin);

// --- Gestão de Tenants ---
/**
 * @swagger
 * /api/v1/sadmin/tenants:
 *   get:
 *     summary: Listar todos os tenants da plataforma
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de tenants com dados de subscrição }
 */
router.get('/v1/sadmin/tenants', requireSuperAdmin(), sadminController.listTenants);

/**
 * @swagger
 * /api/v1/sadmin/tenants/{tenant_id}:
 *   get:
 *     summary: Detalhes completos de um tenant
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenant_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Dados completos do tenant }
 *       404: { description: Tenant não encontrado }
 */
router.get('/v1/sadmin/tenants/:tenant_id', requireSuperAdmin(), sadminController.getTenantDetail);

/**
 * @swagger
 * /api/v1/sadmin/tenants/{tenant_id}/block:
 *   post:
 *     summary: Bloquear tenant (desativa todos os utilizadores)
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenant_id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: Violação dos termos de uso }
 *     responses:
 *       200: { description: Tenant bloqueado }
 */
router.post('/v1/sadmin/tenants/:tenant_id/block', requireSuperAdmin(['superadmin', 'support']), sadminController.blockTenant);

/**
 * @swagger
 * /api/v1/sadmin/tenants/{tenant_id}/unblock:
 *   post:
 *     summary: Desbloquear tenant
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenant_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tenant desbloqueado }
 */
router.post('/v1/sadmin/tenants/:tenant_id/unblock', requireSuperAdmin(['superadmin', 'support']), sadminController.unblockTenant);

/**
 * @swagger
 * /api/v1/sadmin/tenants/{tenant_id}:
 *   delete:
 *     summary: Eliminar tenant e todos os dados (IRREVERSÍVEL — requer header de confirmação)
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenant_id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: X-Confirm-Delete
 *         required: true
 *         schema: { type: string, example: DELETE_TENANT_CONFIRMED }
 *     responses:
 *       200: { description: Tenant eliminado }
 *       400: { description: Confirmação não enviada }
 */
router.delete('/v1/sadmin/tenants/:tenant_id', requireSuperAdmin('superadmin'), sadminController.deleteTenant);

// --- Gestão de Utilizadores (cross-tenant) ---
/**
 * @swagger
 * /api/v1/sadmin/users:
 *   get:
 *     summary: Listar todos os utilizadores da plataforma
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista de utilizadores paginada }
 */
router.get('/v1/sadmin/users', requireSuperAdmin(), sadminController.listAllUsers);

/**
 * @swagger
 * /api/v1/sadmin/users/{id}/status:
 *   patch:
 *     summary: Ativar ou desativar um utilizador
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Status atualizado }
 */
router.patch('/v1/sadmin/users/:id/status', requireSuperAdmin(['superadmin', 'support']), sadminController.updateUserStatus);

// --- Monitoramento e Estatísticas ---
/**
 * @swagger
 * /api/v1/sadmin/stats:
 *   get:
 *     summary: Dashboard global da plataforma SaaS
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Estatísticas globais de tenants, mensagens e WhatsApp }
 */
router.get('/v1/sadmin/stats', requireSuperAdmin(), sadminController.getTenantStats);

/**
 * @swagger
 * /api/v1/sadmin/tenants/summary:
 *   get:
 *     summary: Resumo de subscrições por tenant
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Resumo de subscrições }
 */
router.get('/v1/sadmin/subscriptions/summary', requireSuperAdmin(['superadmin', 'finance']), sadminController.getTenantsSummary);

/**
 * @swagger
 * /api/v1/sadmin/transactions:
 *   get:
 *     summary: Todas as transações financeiras da plataforma
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de transações paginada }
 */
router.get('/v1/sadmin/transactions', requireSuperAdmin(['superadmin', 'finance']), sadminController.listTransactions);

// --- Conversas e Auditoria ---
/**
 * @swagger
 * /api/v1/sadmin/conversations:
 *   get:
 *     summary: Histórico de conversas (qualquer tenant) para auditoria
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         schema: { type: string }
 *       - in: query
 *         name: contact_phone
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Mensagens paginadas }
 */
router.get('/v1/sadmin/conversations', requireSuperAdmin(), sadminController.listConversations);

/**
 * @swagger
 * /api/v1/sadmin/audit-logs:
 *   get:
 *     summary: Trilha de auditoria de todas as ações administrativas
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: admin_id
 *         schema: { type: integer }
 *       - in: query
 *         name: entity_type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Logs de auditoria paginados }
 */
router.get('/v1/sadmin/audit-logs', requireSuperAdmin(), sadminController.listAuditLogs);

/**
 * @swagger
 * /api/v1/sadmin/calls:
 *   get:
 *     summary: Logs de chamadas de todos os tenants
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         schema: { type: string }
 *     responses:
 *       200: { description: Logs de chamadas paginados }
 */
router.get('/v1/sadmin/calls', requireSuperAdmin(), sadminController.listCallLogs);

// --- Sistema ---
/**
 * @swagger
 * /api/v1/sadmin/system/health:
 *   get:
 *     summary: Estado de saúde dos serviços (PostgreSQL, MongoDB, Redis)
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Todos os serviços saudáveis }
 *       503: { description: Algum serviço com problemas }
 */
router.get('/v1/sadmin/system/health', requireSuperAdmin(), sadminController.getSystemHealth);

/**
 * @swagger
 * /api/v1/sadmin/system/maintenance:
 *   post:
 *     summary: Ativar ou desativar modo de manutenção
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled: { type: boolean }
 *               message: { type: string, example: Sistema em manutenção. Volte em breve. }
 *     responses:
 *       200: { description: Modo de manutenção atualizado }
 */
router.post('/v1/sadmin/system/maintenance', requireSuperAdmin('superadmin'), sadminController.toggleMaintenance);

/**
 * @swagger
 * /api/v1/sadmin/system/ws-connections:
 *   get:
 *     summary: Inspecionar conexões WebSocket ativas
 *     tags: [sadmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Info de conexões WS ativas }
 */
router.get('/v1/sadmin/system/ws-connections', requireSuperAdmin(), sadminController.inspectWsConnections);

module.exports = router;
