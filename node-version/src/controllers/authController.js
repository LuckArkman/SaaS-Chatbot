const { v4: uuidv4 } = require('uuid');
const { User } = require('../models/sql/models');
const security = require('../utils/security');
const logger = require('../utils/logger');
// const BillingService = require('../services/billingService'); // A ser implementado

const login = async (req, res) => {
  // Aceita tanto OAuth2 (username) quanto REST puro (email)
  const { username, email, password } = req.body;
  const loginEmail = username || email;
  
  logger.info(`[Auth] Tentativa de login. Body recebido: ${JSON.stringify(req.body)}`);

  if (!loginEmail || !password) {
    return res.status(400).json({ detail: 'Missing email/username or password' });
  }

  try {
    // Note que não estamos no contexto do tenant aqui, a busca é global
    const user = await User.findOne({ where: { email: loginEmail }, ignoreTenant: true });
    
    if (!user || !(await security.verifyPassword(password, user.hashed_password))) {
      return res.status(400).json({ detail: 'Incorrect email or password' });
    }
    if (!user.is_active) {
      return res.status(400).json({ detail: 'Inactive user' });
    }

    const accessToken = security.createAccessToken(user.id, user.tenant_id);
    const refreshToken = security.createRefreshToken(user.id);
    
    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer'
    });
  } catch (e) {
    logger.error(`[Auth] Erro no login: ${e.message}`);
    return res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const register = async (req, res) => {
  const { email, password, full_name } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email }, ignoreTenant: true });
    if (existingUser) {
      return res.status(400).json({ detail: 'The user with this email already exists in the system.' });
    }

    try {
      security.validatePasswordComplexity(password);
    } catch (valErr) {
      return res.status(400).json({ detail: valErr.message });
    }

    const newTenantId = uuidv4().substring(0, 8).toUpperCase();
    const hashedPassword = await security.getPasswordHash(password);

    const userObj = await User.create({
      email,
      hashed_password: hashedPassword,
      full_name,
      tenant_id: newTenantId,
      is_active: true
    }, { ignoreTenant: true }); // Ignora pq o usuário está criando o tenant agora

    // BillingService.assignDefaultPlan(newTenantId);

    logger.info(`🆕 Novo usuário registrado: ${userObj.email} | Tenant: ${newTenantId}`);
    
    // Retorna ocultando hash
    const responseData = userObj.toJSON();
    delete responseData.hashed_password;
    
    return res.json(responseData);

  } catch (e) {
    logger.error(`[Auth] Erro no registro: ${e.message}`);
    return res.status(500).json({ detail: 'Internal Server Error' });
  }
};

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
      return res.status(400).json({ detail: 'Current password incorrect' });
    }

    try {
      security.validatePasswordComplexity(new_password);
    } catch (valErr) {
      return res.status(400).json({ detail: valErr.message });
    }

    currentUser.hashed_password = await security.getPasswordHash(new_password);
    await currentUser.save();

    const responseData = currentUser.toJSON();
    delete responseData.hashed_password;
    return res.json(responseData);

  } catch (e) {
    return res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const refresh = async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ detail: 'Refresh token is missing' });
  }

  try {
    const SECRET_KEY = process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refresh_token, SECRET_KEY);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ detail: 'Invalid token type' });
    }

    const user = await User.findByPk(decoded.sub, { ignoreTenant: true });
    if (!user || !user.is_active) {
      return res.status(401).json({ detail: 'User not found or inactive' });
    }

    const newAccessToken = security.createAccessToken(user.id, user.tenant_id);
    const newRefreshToken = security.createRefreshToken(user.id);

    return res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer'
    });
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired refresh token' });
  }
};

module.exports = { login, register, getMe, changePassword, refresh };
