const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_KEY_PATH = path.resolve(__dirname, '../../keys/id_ed25519_redes_n1');

const getSshConfig = () => ({
  host: '192.168.100.10',
  port: 22,
  username: 'administrador',
  privateKey: fs.readFileSync(SSH_KEY_PATH)
});

// Executa um comando via SSH2 com chave privada
const executeSshCommand = (command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) {
            return reject(new Error(`Comando falhou com código ${code}: ${stderr}`));
          }
          resolve(stdout.trim());
        }).on('data', (data) => {
          stdout += data.toString();
        }).stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect(getSshConfig());
  });
};

// 1. Consultar hostname atual e usuário SSH
const getSystemInfoSsh = async () => {
  const user = await executeSshCommand('whoami');
  const hostname = await executeSshCommand('hostnamectl --static');
  return { user, hostname };
};

// 2. Operação predefinida: Alteração reversível do Hostname via SSH
const changeAndRestoreHostname = async (tempHostname) => {
  // Validação estrita do novo nome (apenas letras, números e hífens)
  if (!/^[a-zA-Z0-9-]+$/.test(tempHostname)) {
    throw new Error('Nome de host inválido. Use apenas letras, números e hífens.');
  }

  // A. Guardar o nome original
  const originalHostname = await executeSshCommand('hostnamectl --static');

  // B. Alterar para o nome temporário predefinido
  await executeSshCommand(`sudo hostnamectl set-hostname ${tempHostname}`);
  const changedHostname = await executeSshCommand('hostnamectl --static');

  // C. Restaurar o nome original
  await executeSshCommand(`sudo hostnamectl set-hostname "${originalHostname}"`);
  const restoredHostname = await executeSshCommand('hostnamectl --static');

  return {
    originalHostname,
    tempHostnameApplied: changedHostname,
    restoredHostname,
    success: restoredHostname === originalHostname
  };
};

module.exports = { getSystemInfoSsh, changeAndRestoreHostname };