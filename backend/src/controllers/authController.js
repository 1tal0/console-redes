const db = require('../database/init');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Utilizador e palavra-passe são obrigatórios.' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro de comunicação com o banco de dados.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos.' });
    }

    // Gerar Token JWT com dados do utilizador e perfil
    const token = jwt.sign(
      { id: user.id, name: user.name, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });
  });
};

const me = (req, res) => {
  return res.json({ user: req.user });
};

module.exports = { login, me };