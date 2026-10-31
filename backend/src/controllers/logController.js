const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Mapeamento de fontes de log permitidas
const LOG_SOURCES = {
  system: 'sudo journalctl -n 50 --no-pager',
  auth: 'sudo journalctl _COMM=sudo _COMM=sshd -n 50 --no-pager',
  ftp: 'sudo journalctl -u vsftpd -n 50 --no-pager || tail -n 50 /var/log/vsftpd.log',
  mail: 'sudo journalctl -u postfix -u dovecot -n 50 --no-pager || tail -n 50 /var/log/mail.log',
  apache: 'sudo tail -n 50 /var/log/apache2/access.log'
};

const getLogs = async (req, res) => {
  const { type = 'system' } = req.query;

  const command = LOG_SOURCES[type];
  if (!command) {
    return res.status(400).json({ error: 'Tipo de log inválido.' });
  }

  try {
    const { stdout, stderr } = await execPromise(command);
    const lines = (stdout || stderr || '').split('\n').filter(Boolean);
    
    return res.json({
      type,
      totalLines: lines.length,
      logs: lines
    });
  } catch (error) {
    console.error(`Erro ao consultar logs (${type}):`, error.message);
    return res.status(500).json({ 
      error: 'Falha ao consultar logs no servidor Debian.',
      details: error.message 
    });
  }
};

module.exports = { getLogs };