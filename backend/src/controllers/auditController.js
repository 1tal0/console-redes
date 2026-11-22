const { MODULES, OUTCOMES, listAuditEvents } = require('../services/auditService');

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value ? value : null;
}

async function getAuditEvents(req, res) {
  const { module, outcome, username, before, from, to } = req.query;
  const beforeId = Number(before);
  if (
    (module !== undefined && !MODULES.includes(module)) ||
    (outcome !== undefined && !OUTCOMES.includes(outcome)) ||
    (username !== undefined && (typeof username !== 'string' || username.length > 128)) ||
    (before !== undefined && (typeof before !== 'string' || !/^[1-9]\d*$/.test(before) || !Number.isSafeInteger(beforeId))) ||
    (from !== undefined && !parseDate(from)) ||
    (to !== undefined && !parseDate(to)) ||
    (from && to && from >= to)
  ) {
    return res.status(400).json({ error: 'Filtros de auditoria inválidos.' });
  }

  try {
    const page = await listAuditEvents({ module, outcome, username, before: beforeId, from, to });
    return res.set('Cache-Control', 'no-store').json(page);
  } catch (error) {
    console.error('Falha ao consultar auditoria:', error.code);
    return res.status(500).json({ error: 'Falha ao consultar a trilha de auditoria.' });
  }
}

module.exports = { getAuditEvents };
