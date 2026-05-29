const { v4: uuidv4 } = require('uuid');
const { User } = require('../models/sql/models');
const security = require('../utils/security');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Monta o payload de token normalizado (usado em todas as respostas auth). */
const buildTokenResponse = (user, extra = {}) => {
  const accessToken = security.createAccessToken(user.id, user.tenant_id);
  const refreshToken = security.createRefreshToken(user.id);
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    tenant_id: user.tenant_id,
    user_id: user.id,
    ...extra,
  };
};

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// Aceita JSON { email, password } OU form-encoded { username, password }
// ---------------------------------------------------------------------------
const login = async (req, res) => {
  // Suporte a OAuth2-style (username) e REST-style (email)
  const { username, email, password } = req.body;
  const loginEmail = (username || email || '').trim().toLowerCase();

  logger.info(`[Auth] Tentativa de login para: ${loginEmail}`);

  if (!loginEmail || !password) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      detail: 'Os campos email (ou username) e password são obrigatórios.',
      fields: [
        ...(!loginEmail ? ['email'] : []),
        ...(!password ? ['password'] : []),
      ],
    });
  }

  try {
    const user = await User.findOne({ where: { email: loginEmail }, ignoreTenant: true });

    if (!user || !(await security.verifyPassword(password, user.hashed_password))) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        detail: 'E-mail ou senha incorretos.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'INACTIVE_USER',
        detail: 'Esta conta está desativada.',
      });
    }

    logger.info(`[Auth] Login bem-sucedido: ${loginEmail} | Tenant: ${user.tenant_id}`);
    return res.status(200).json(buildTokenResponse(user));

  } catch (e) {
    logger.error(`[Auth] Erro no login: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: 'Internal Server Error' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// Comportamento idempotente:
//   - E-mail novo           → 201 + JWT  { created: true }
//   - E-mail existe + senha correta  → 200 + JWT  { created: false }
//   - E-mail existe + senha errada   → 409  { error: "EMAIL_ALREADY_EXISTS", code: "PASSWORD_MISMATCH" }
// ---------------------------------------------------------------------------
const register = async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      detail: 'Os campos email e password são obrigatórios.',
      fields: [...(!email ? ['email'] : []), ...(!password ? ['password'] : [])],
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ where: { email: normalizedEmail }, ignoreTenant: true });

    if (existingUser) {
      // E-mail já existe — verificar senha
      const passwordMatches = await security.verifyPassword(password, existingUser.hashed_password);

      if (!passwordMatches) {
        return res.status(409).json({
          error: 'EMAIL_ALREADY_EXISTS',
          code: 'PASSWORD_MISMATCH',
          detail: 'Este e-mail já está registado com uma senha diferente.',
        });
      }

      // Senha correta → funciona como login
      logger.info(`[Auth] Register idempotente (login): ${normalizedEmail}`);
      return res.status(200).json(buildTokenResponse(existingUser, { created: false }));
    }

    // E-mail novo — validar complexidade e criar
    try {
      security.validatePasswordComplexity(password);
    } catch (valErr) {
      return res.status(422).json({ error: 'WEAK_PASSWORD', detail: valErr.message });
    }

    const newTenantId = uuidv4().substring(0, 8).toUpperCase();
    const hashedPassword = await security.getPasswordHash(password);

    const newUser = await User.create({
      email: normalizedEmail,
      hashed_password: hashedPassword,
      full_name: full_name || '',
      tenant_id: newTenantId,
      is_active: true,
    }, { ignoreTenant: true });

    logger.info(`🆕 Novo utilizador registado: ${newUser.email} | Tenant: ${newTenantId}`);

    return res.status(201).json(buildTokenResponse(newUser, { created: true }));

  } catch (e) {
    logger.error(`[Auth] Erro no register: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: 'Internal Server Error' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/auth/provision   (protegido por X-Service-Key)
// Endpoint único para integração Hotspot — cria, faz login ou atualiza senha.
// Corpo: { email, password, full_name?, tenant_name? }
//
// Comportamento:
//   - E-mail novo          → 201 + JWT  { created: true }
//   - E-mail existe + senha correta  → 200 + JWT  { created: false }
//   - E-mail existe + senha errada   → 200 + JWT  { created: false, password_updated: true }
//     (atualiza a senha automaticamente — só possível com a Service Key)
// ---------------------------------------------------------------------------
const provision = async (req, res) => {
  const { email, password, full_name, tenant_name } = req.body;

  if (!email || !password) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      detail: 'Os campos email e password são obrigatórios.',
      fields: [...(!email ? ['email'] : []), ...(!password ? ['password'] : [])],
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ where: { email: normalizedEmail }, ignoreTenant: true });

    if (existingUser) {
      const passwordMatches = await security.verifyPassword(password, existingUser.hashed_password);

      if (!passwordMatches) {
        // Atualiza senha automaticamente (privilégio da Service Key)
        existingUser.hashed_password = await security.getPasswordHash(password);
        await existingUser.save();
        logger.info(`[Provision] Senha atualizada para: ${normalizedEmail}`);
        return res.status(200).json(
          buildTokenResponse(existingUser, { created: false, password_updated: true })
        );
      }

      logger.info(`[Provision] Login via provision para: ${normalizedEmail}`);
      return res.status(200).json(buildTokenResponse(existingUser, { created: false, password_updated: false }));
    }

    // Utilizador novo — sem validação de complexidade (Hotspot pode usar senhas simples)
    const newTenantId = uuidv4().substring(0, 8).toUpperCase();
    const hashedPassword = await security.getPasswordHash(password);

    const newUser = await User.create({
      email: normalizedEmail,
      hashed_password: hashedPassword,
      full_name: full_name || tenant_name || normalizedEmail.split('@')[0],
      tenant_id: newTenantId,
      is_active: true,
    }, { ignoreTenant: true });

    logger.info(`🆕 [Provision] Novo utilizador criado: ${newUser.email} | Tenant: ${newTenantId}`);

    return res.status(201).json(buildTokenResponse(newUser, { created: true, password_updated: false }));

  } catch (e) {
    logger.error(`[Provision] Erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: 'Internal Server Error' });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/users/:email/password   (protegido por X-Service-Key)
// Reset de senha sem fluxo de e-mail — uso exclusivo por painel admin/developer.
// ---------------------------------------------------------------------------
const adminResetPassword = async (req, res) => {
  const { email } = req.params;
  const { new_password } = req.body;

  if (!new_password) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      detail: 'O campo new_password é obrigatório.',
    });
  }

  try {
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() }, ignoreTenant: true });

    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', detail: `Utilizador não encontrado: ${email}` });
    }

    user.hashed_password = await security.getPasswordHash(new_password);
    await user.save();

    logger.info(`[AdminResetPassword] Senha redefinida para: ${email}`);
    return res.status(200).json({ success: true, email: user.email });

  } catch (e) {
    logger.error(`[AdminResetPassword] Erro: ${e.message}`);
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: 'Internal Server Error' });
  }
};

// ---------------------------------------------------------------------------
// Endpoints existentes mantidos
// ---------------------------------------------------------------------------

const getMe = async (req, res) => {
  const responseData = req.user.toJSON();
  delete responseData.hashed_password;
  return res.json(responseData);
};

const changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  const currentUser = req.user;

  try {
    if (!(await security.verifyPassword(old_password, currentUser.hashed_password))) {
      return res.status(400).json({ error: 'WRONG_PASSWORD', detail: 'Senha atual incorreta.' });
    }

    try {
      security.validatePasswordComplexity(new_password);
    } catch (valErr) {
      return res.status(422).json({ error: 'WEAK_PASSWORD', detail: valErr.message });
    }

    currentUser.hashed_password = await security.getPasswordHash(new_password);
    await currentUser.save();

    const responseData = currentUser.toJSON();
    delete responseData.hashed_password;
    return res.json(responseData);

  } catch (e) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: 'Internal Server Error' });
  }
};

const refresh = async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'MISSING_TOKEN', detail: 'refresh_token é obrigatório.' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const SECRET_KEY = process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';
    const decoded = jwt.verify(refresh_token, SECRET_KEY);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'INVALID_TOKEN_TYPE', detail: 'Tipo de token inválido.' });
    }

    const user = await User.findByPk(decoded.sub, { ignoreTenant: true });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'USER_INACTIVE', detail: 'Utilizador não encontrado ou inativo.' });
    }

    return res.status(200).json(buildTokenResponse(user));

  } catch (err) {
    return res.status(401).json({ error: 'INVALID_TOKEN', detail: 'Token de refresh inválido ou expirado.' });
  }
};

module.exports = {
  login,
  register,
  provision,
  adminResetPassword,
  getMe,
  changePassword,
  refresh,
};
