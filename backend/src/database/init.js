require('../config/env');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(async () => {
  // Criar Tabela de Utilizadores
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'operador', 'leitor')) NOT NULL DEFAULT 'leitor',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Gerar Hashes das Palavras-passe Iniciais
  const salt = await bcrypt.genSalt(10);
  const hashAdmin = await bcrypt.hash('admin123', salt);
  const hashOperador = await bcrypt.hash('operador123', salt);
  const hashLeitor = await bcrypt.hash('leitor123', salt);

  // Inserir Utilizadores Padrão (caso a tabela esteja vazia)
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (name, username, password, role)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run('Administrador do Sistema', 'admin', hashAdmin, 'admin');
  stmt.run('Operador de Serviços', 'operador', hashOperador, 'operador');
  stmt.run('Leitor de Métricas', 'leitor', hashLeitor, 'leitor');
  stmt.finalize();

  console.log('Banco de Dados SQLite e perfis (admin, operador, leitor) inicializados!');
});

module.exports = db;