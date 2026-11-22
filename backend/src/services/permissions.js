const { SERVICES } = require('./serviceControlService');

const SERVICE_ACTIONS = [['start', 'Iniciar'], ['stop', 'Parar'], ['restart', 'Reiniciar']];
const PERMISSION_GROUPS = [
  { label: 'FTP', options: [
    { id: 'ftp.read', label: 'Listar, baixar e verificar arquivos' },
    { id: 'ftp.upload', label: 'Enviar arquivos', requires: 'ftp.read' }
  ] },
  { label: 'Correio', options: [
    { id: 'mail.read', label: 'Consultar caixas e mensagens' },
    { id: 'mail.send', label: 'Enviar mensagens', requires: 'mail.read' }
  ] },
  { label: 'SSH', options: [
    { id: 'ssh.read', label: 'Consultar o servidor' },
    { id: 'ssh.hostname', label: 'Alterar e restaurar o hostname', requires: 'ssh.read' }
  ] },
  { label: 'Logs do Servidor', options: [{ id: 'logs.read', label: 'Consultar logs' }] },
  ...SERVICES.map(service => ({
    label: service,
    options: SERVICE_ACTIONS.map(([action, label]) => ({ id: `services.${service}.${action}`, label }))
  }))
];
const PERMISSIONS = new Map(PERMISSION_GROUPS.flatMap(group => group.options).map(option => [option.id, option]));
const READER_PERMISSIONS = ['ftp.read', 'mail.read', 'ssh.read'];

function validatePermissions(value, role) {
  if (!Array.isArray(value) || value.length > PERMISSIONS.size || value.some(id => !PERMISSIONS.has(id))) return false;
  if (role !== 'operador') return value.length === 0;
  return value.every(id => {
    const { requires } = PERMISSIONS.get(id);
    return !requires || value.includes(requires);
  });
}

function storedPermissions(value) {
  try {
    const permissions = JSON.parse(value);
    return validatePermissions(permissions, 'operador') ? permissions : [];
  } catch {
    return [];
  }
}

function publicUser(row) {
  const { permissions_json, password, ...user } = row;
  return { ...user, permissions: user.role === 'operador' ? storedPermissions(permissions_json) : [] };
}

function allowed(user, permission) {
  return user.role === 'admin'
    || (user.role === 'leitor' && READER_PERMISSIONS.includes(permission))
    || (user.role === 'operador' && user.permissions.includes(permission));
}

module.exports = { PERMISSION_GROUPS, PERMISSIONS, validatePermissions, publicUser, allowed };
