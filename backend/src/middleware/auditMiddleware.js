const { recordAuditEvent } = require('../services/auditService');
const { SERVICES } = require('../services/serviceControlService');

const SERVICE_ACTIONS = new Map([['start', 'Iniciar serviço'], ['stop', 'Parar serviço'], ['restart', 'Reiniciar serviço']]);
const ROUTES = [
  ['POST', /^\/auth\/login$/, 'Sessão', 'Entrar'],
  ['POST', /^\/auth\/logout$/, 'Sessão', 'Sair'],
  ['GET', /^\/auth\/me$/, 'Sessão', 'Consultar sessão'],
  ['GET', /^\/metrics$/, 'Observabilidade', 'Coletar métricas'],
  ['POST', /^\/services\/[^/]+\/[^/]+$/, 'Serviços', 'Controlar serviço'],
  ['GET', /^\/files$/, 'FTP', 'Listar arquivos'],
  ['POST', /^\/files\/upload$/, 'FTP', 'Enviar arquivo'],
  ['GET', /^\/files\/download\/[^/]+$/, 'FTP', 'Baixar arquivo'],
  ['GET', /^\/files\/integrity\/[^/]+$/, 'FTP', 'Verificar integridade'],
  ['GET', /^\/mail$/, 'Correio', 'Listar mensagens'],
  ['GET', /^\/mail\/message$/, 'Correio', 'Ler mensagem'],
  ['POST', /^\/mail\/send$/, 'Correio', 'Enviar mensagem'],
  ['GET', /^\/ssh\/info$/, 'SSH', 'Consultar servidor'],
  ['POST', /^\/ssh\/hostname$/, 'SSH', 'Alterar e restaurar hostname'],
  ['GET', /^\/logs$/, 'Logs', 'Consultar logs'],
  ['GET', /^\/users$/, 'Usuários', 'Listar usuários'],
  ['POST', /^\/users$/, 'Usuários', 'Criar usuário'],
  ['PUT', /^\/users\/([0-9]+)$/, 'Usuários', 'Atualizar usuário'],
  ['DELETE', /^\/users\/([0-9]+)$/, 'Usuários', 'Excluir usuário'],
  ['GET', /^\/audit$/, 'Auditoria', 'Consultar auditoria'],
  ['GET', /^\/health$/, 'API', 'Verificar disponibilidade']
];

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function describeRequest(method, path) {
  for (const [verb, pattern, module, label] of ROUTES) {
    if (method !== verb && !(method === 'HEAD' && verb === 'GET')) continue;
    const match = pattern.exec(path.toLowerCase());
    if (!match) continue;
    if (module === 'Serviços') {
      const [, , service, action] = path.split('/').map(decodeSegment);
      return {
        module,
        action: SERVICE_ACTIONS.get(action) || label,
        resource: SERVICES.includes(service) ? service : null
      };
    }
    return { module, action: label, resource: match[1] && `Usuário #${match[1].slice(0, 20)}` };
  }
  return { module: 'API', action: 'Requisição sem ação catalogada' };
}

function classify(status, interrupted, partial) {
  if (interrupted) return 'interrompido';
  if (status === 401 || status === 403) return 'negado';
  if (status >= 400) return 'falha';
  return partial ? 'parcial' : 'sucesso';
}

function auditRequest(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const event = describeRequest(req.method, req.path.replace(/\/$/, ''));
  const start = process.hrtime.bigint();
  const sourceIp = req.ip;

  function record(interrupted) {
    const status = interrupted && !res.headersSent ? null : res.statusCode;
    const actor = req.user;
    recordAuditEvent({
      ...event,
      occurredAt: new Date().toISOString(),
      actor,
      attemptedUsername: actor ? null : res.locals.auditAttemptedUsername,
      resource: res.locals.auditResource ?? event.resource,
      outcome: classify(status, interrupted, res.locals.auditPartial),
      reason: interrupted ? 'Conexão encerrada antes de concluir a resposta.' : res.locals.auditReason,
      method: req.method,
      httpStatus: status,
      durationMs: Number((process.hrtime.bigint() - start) / 1000000n),
      sourceIp
    });
  }

  res.once('finish', () => record(false));
  res.once('close', () => {
    if (!res.writableFinished) record(true);
  });
  return next();
}

module.exports = { auditRequest };
