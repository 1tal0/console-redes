const db = require('../database/init');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { publicUser } = require('../services/permissions');

const login = (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username === 'string' && username.length <= 128 && !/[\u0000-\u001f\u007f]/.test(username)) {
    res.locals.auditAttemptedUsername = username || null;
  }

  if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
    res.locals.auditReason = 'Credenciais ausentes ou em formato inválido.';
    return res.status(400).json({ error: 'Utilizador e palavra-passe são obrigatórios.' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro de comunicação com o banco de dados.' });
    }

    let validPassword;
    try {
      validPassword = user && await bcrypt.compare(password, user.password);
    } catch {
      return res.status(500).json({ error: 'Erro ao verificar as credenciais.' });
    }
    if (!validPassword) {
      res.locals.auditReason = 'Credenciais incorretas.';
      return res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos.' });
    }

    // Gerar Token JWT com dados do utilizador e perfil
    const token = jwt.sign(
      { id: user.id, name: user.name, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    req.user = publicUser(user);
    return res.json({
      message: 'Login realizado com sucesso',
      token,
      user: req.user
    });
  });
};

const me = (req, res) => {
  return res.set('Cache-Control', 'no-store').json({ user: req.user });
};

const logout = (req, res) => res.status(204).end();

module.exports = { login, logout, me };
