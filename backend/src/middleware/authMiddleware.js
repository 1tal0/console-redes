const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

const JWT_SECRET = jwtSecret;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permissão insuficiente. Operação não autorizada para este perfil.'
      });
    }
    next();
  };
};

module.exports = { verifyToken, checkRole, JWT_SECRET };
