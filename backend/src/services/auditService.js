const db = require('../database/init');

const OUTCOMES = ['sucesso', 'parcial', 'falha', 'negado', 'interrompido'];
const MODULES = ['Sessão', 'Observabilidade', 'Serviços', 'FTP', 'Correio', 'SSH', 'Logs', 'Usuários', 'Auditoria', 'API'];
const PAGE_SIZE = 25;

function recordAuditEvent(event) {
  db.serialize(() => db.run(
    `INSERT INTO audit_events (
      occurred_at, actor_id, actor_username, actor_role, attempted_username,
      module, action, resource, outcome, reason, method, http_status, duration_ms, source_ip
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.occurredAt, event.actor?.id, event.actor?.username, event.actor?.role, event.attemptedUsername,
      event.module, event.action, event.resource, event.outcome, event.reason,
      event.method, event.httpStatus, event.durationMs, event.sourceIp
    ].map(value => value ?? null),
    (error) => {
      if (error) console.error('Falha ao persistir evento de auditoria:', error.code);
    }
  ));
}

function listAuditEvents({ module, outcome, username, before, from, to }) {
  const conditions = [];
  const values = [];
  if (module) {
    conditions.push('module = ?');
    values.push(module);
  }
  if (outcome) {
    conditions.push('outcome = ?');
    values.push(outcome);
  }
  if (username) {
    conditions.push('COALESCE(actor_username, attempted_username) = ? COLLATE NOCASE');
    values.push(username);
  }
  if (before) {
    conditions.push('id < ?');
    values.push(before);
  }
  if (from) {
    conditions.push('occurred_at >= ?');
    values.push(from);
  }
  if (to) {
    conditions.push('occurred_at < ?');
    values.push(to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    db.serialize(() => db.all(
      `SELECT * FROM audit_events ${where} ORDER BY id DESC LIMIT ?`,
      [...values, PAGE_SIZE + 1],
      (error, rows) => {
        if (error) return reject(error);
        const events = rows.slice(0, PAGE_SIZE);
        return resolve({ events, nextBefore: rows.length > PAGE_SIZE ? events.at(-1).id : null });
      }
    ));
  });
}

module.exports = { MODULES, OUTCOMES, recordAuditEvent, listAuditEvents };
