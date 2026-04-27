const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES) || 1440;

const getPasswordHash = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const { v4: uuidv4 } = require('uuid');

const createAccessToken = (subject, tenantId) => {
  // Apenas 15 minutos para garantir segurança máxima no session token
  const expiresIn = 15 * 60; // 15 minutos em segundos
  const payload = {
    sub: String(subject),
    tenant_id: tenantId,
    jti: uuidv4() // Token Aleatório único para prevenir replay attacks e habilitar rotação
  };

  return jwt.sign(payload, SECRET_KEY, { algorithm: ALGORITHM, expiresIn });
};

const createRefreshToken = (subject) => {
  // Refresh token com expiração longa (ex: 7 dias) e ID aleatório forte
  const expiresIn = 7 * 24 * 60 * 60; // 7 dias
  const payload = {
    sub: String(subject),
    type: 'refresh',
    jti: uuidv4()
  };

  return jwt.sign(payload, SECRET_KEY, { algorithm: ALGORITHM, expiresIn });
};

const validatePasswordComplexity = (password) => {
  if (password.length < 8) throw new Error('A senha deve ter no mínimo 8 caracteres.');
  if (!/[A-Z]/.test(password)) throw new Error('A senha deve ter pelo menos uma letra maiúscula.');
  if (!/[a-z]/.test(password)) throw new Error('A senha deve ter pelo menos uma letra minúscula.');
  if (!/[0-9]/.test(password)) throw new Error('A senha deve ter pelo menos um número.');
  if (!/[^A-Za-z0-9]/.test(password)) throw new Error('A senha deve ter pelo menos um caractere especial.');
};

module.exports = {
  getPasswordHash,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  validatePasswordComplexity
};
