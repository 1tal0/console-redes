function createAuditSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL,
      actor_id INTEGER,
      actor_username TEXT,
      actor_role TEXT,
      attempted_username TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT,
      outcome TEXT NOT NULL CHECK(outcome IN ('sucesso', 'parcial', 'falha', 'negado', 'interrompido')),
      reason TEXT,
      method TEXT NOT NULL,
      http_status INTEGER,
      duration_ms INTEGER NOT NULL,
      source_ip TEXT
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS audit_module_id ON audit_events (module, id)');
  db.run('CREATE INDEX IF NOT EXISTS audit_outcome_id ON audit_events (outcome, id)');
}

module.exports = { createAuditSchema };
