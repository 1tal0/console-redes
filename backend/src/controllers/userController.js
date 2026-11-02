const db = require('../database/init');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'operador', 'leitor'];

const getUsers = (req, res) => {
  db.all(
    'SELECT id, name, username, role, created_at FROM users ORDER BY id ASC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao listar utilizadores.' });
      }
      return res.json({ users: rows || [] });
    }
  );
};

const createUser = async (req, res) => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Nome, utilizador, palavra-passe e perfil são obrigatórios.' });
  }

  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido. Utilize admin, operador ou leitor.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'A palavra-passe deve ter no mínimo 6 caracteres.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    db.run(
      'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), username.trim(), hashedPassword, role],
      function (err) {
        if (err) {
          if (err.message && err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Já existe um utilizador com este username.' });
          }
          return res.status(500).json({ error: 'Erro ao criar utilizador.' });
        }

        db.get(
          'SELECT id, name, username, role, created_at FROM users WHERE id = ?',
          [this.lastID],
          (getErr, user) => {
            if (getErr) {
              return res.status(201).json({ message: 'Utilizador criado com sucesso.', id: this.lastID });
            }
            return res.status(201).json({ message: 'Utilizador criado com sucesso.', user });
          }
        );
      }
    );
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao processar a palavra-passe.' });
  }
};

const updateUser = (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Nome e perfil são obrigatórios.' });
  }

  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido. Utilize admin, operador ou leitor.' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao localizar o utilizador.' });
    }
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    // Impede que o utilizador autenticado altere o próprio papel
    if (Number(req.user.id) === Number(user.id) && role !== user.role) {
      return res.status(400).json({ error: 'Você não pode alterar o seu próprio papel de acesso.' });
    }

    // Impede rebaixar o último administrador
    if (user.role === 'admin' && role !== 'admin') {
      db.get(
        "SELECT COUNT(*) AS total FROM users WHERE role = 'admin'",
        [],
        async (countErr, row) => {
          if (countErr) {
            return res.status(500).json({ error: 'Erro ao validar perfis de administrador.' });
          }
          if (row.total <= 1) {
            return res.status(400).json({ error: 'Não é permitido rebaixar o último administrador.' });
          }
          return persistUpdate();
        }
      );
    } else {
      return persistUpdate();
    }

    async function persistUpdate() {
      try {
        let hashedPassword = user.password;
        if (password && String(password).trim() !== '') {
          if (String(password).length < 6) {
            return res.status(400).json({ error: 'A palavra-passe deve ter no mínimo 6 caracteres.' });
          }
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }

        db.run(
          'UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?',
          [name.trim(), role, hashedPassword, id],
          function (updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: 'Erro ao atualizar utilizador.' });
            }

            db.get(
              'SELECT id, name, username, role, created_at FROM users WHERE id = ?',
              [id],
              (getErr, updated) => {
                if (getErr) {
                  return res.json({ message: 'Utilizador atualizado com sucesso.' });
                }
                return res.json({ message: 'Utilizador atualizado com sucesso.', user: updated });
              }
            );
          }
        );
      } catch (hashErr) {
        return res.status(500).json({ error: 'Erro ao processar a palavra-passe.' });
      }
    }
  });
};

const deleteUser = (req, res) => {
  const { id } = req.params;
  const targetId = Number(id);

  if (Number(req.user.id) === targetId) {
    return res.status(400).json({ error: 'Não é permitido excluir o próprio utilizador autenticado.' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [targetId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao localizar o utilizador.' });
    }
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    const finishDelete = () => {
      db.run('DELETE FROM users WHERE id = ?', [targetId], function (delErr) {
        if (delErr) {
          return res.status(500).json({ error: 'Erro ao remover utilizador.' });
        }
        return res.json({ message: 'Utilizador removido com sucesso.' });
      });
    };

    if (user.role === 'admin') {
      db.get("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'", [], (countErr, row) => {
        if (countErr) {
          return res.status(500).json({ error: 'Erro ao validar perfis de administrador.' });
        }
        if (row.total <= 1) {
          return res.status(400).json({ error: 'Não é permitido excluir o último administrador.' });
        }
        return finishDelete();
      });
    } else {
      return finishDelete();
    }
  });
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
