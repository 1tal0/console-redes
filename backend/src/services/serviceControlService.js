const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const SYSTEMCTL = '/bin/systemctl';
const SERVICES = Object.freeze(['apache2', 'vsftpd', 'postfix', 'dovecot', 'ssh']);
const ACTIONS = ['start', 'stop', 'restart'];
const busyServices = new Set();

function controlError(status, message, cause) {
  return Object.assign(new Error(message, { cause }), { status });
}

function validateService(serviceName) {
  if (!SERVICES.includes(serviceName)) {
    throw controlError(400, 'Serviço não permitido.');
  }
}

async function getServiceStatus(serviceName) {
  validateService(serviceName);
  const { stdout } = await execFileAsync(
    SYSTEMCTL, ['show', serviceName, '-p', 'ActiveState', '-p', 'SubState'],
    { timeout: 5000 }
  );
  const properties = Object.fromEntries(stdout.trim().split(/\r?\n/).map(line => line.split('=')));
  const { ActiveState: activeState, SubState: subState } = properties;

  if (!activeState || !subState) {
    throw new Error('Resposta incompleta do systemctl show.');
  }

  return {
    state: activeState === 'active' ? 'ativo' : 'inativo',
    activeState,
    subState
  };
}

async function controlService(serviceName, action) {
  validateService(serviceName);
  if (!ACTIONS.includes(action)) {
    throw controlError(400, 'Ação não permitida.');
  }
  if (busyServices.has(serviceName)) {
    throw controlError(409, 'Já existe uma operação em andamento para este serviço.');
  }

  busyServices.add(serviceName);
  try {
    try {
      await execFileAsync('/usr/bin/sudo', ['-n', SYSTEMCTL, action, serviceName], {
        timeout: 120000
      });
    } catch (error) {
      if (error.killed) {
        throw controlError(504, 'Tempo limite atingido. Confira o estado atual do serviço.', error);
      }
      throw controlError(500, 'Falha ao executar a ação no serviço.', error);
    }

    try {
      return await getServiceStatus(serviceName);
    } catch (error) {
      throw controlError(500, 'A ação foi executada, mas não foi possível consultar o novo estado.', error);
    }
  } finally {
    busyServices.delete(serviceName);
  }
}

module.exports = { SERVICES, getServiceStatus, controlService };
