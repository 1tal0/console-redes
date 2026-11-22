const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const db = require('../database/init');
const { publicUser, allowed, PERMISSIONS } = require('../services/permissions');

const JWT_SECRET = jwtSecret;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.locals.auditReason = 'Token ausente.';
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  let claims;
  try {
    claims = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.locals.auditReason = err.name === 'TokenExpiredError' ? 'Token expirado.' : 'Token inválido.';
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
  db.get('SELECT id, name, username, role, permissions_json FROM users WHERE id = ?', [claims.id ?? null], (error, row) => {
    if (error) return res.status(500).json({ error: 'Falha ao verificar a sessão.' });
    if (!row) {
      res.locals.auditReason = 'Conta da sessão não encontrada.';
      return res.status(401).json({ error: 'A conta da sessão não está disponível.' });
    }
    req.user = publicUser(row);
    return next();
  });
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.locals.auditReason = 'Perfil sem permissão.';
      return res.status(403).json({
        error: 'Permissão insuficiente. Operação não autorizada para este perfil.'
      });
    }
    next();
  };
};

const requirePermission = (permission) => (req, res, next) => {
  const id = typeof permission === 'function' ? permission(req) : permission;
  if (!PERMISSIONS.has(id)) return res.status(400).json({ error: 'Serviço ou ação não permitidos.' });
  if (!allowed(req.user, id)) {
    res.locals.auditReason = `Permissão ausente: ${id}.`;
    return res.status(403).json({ error: 'Permissão insuficiente para esta operação.' });
  }
  return next();
};

module.exports = { verifyToken, checkRole, requirePermission, JWT_SECRET };
