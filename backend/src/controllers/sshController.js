const { getSystemInfoSsh, changeAndRestoreHostname } = require('../services/sshService');

const getSshInfo = async (req, res) => {
  try {
    const info = await getSystemInfoSsh();
    return res.json(info);
  } catch (error) {
    console.error('Erro na consulta SSH:', error);
    return res.status(500).json({ error: 'Falha ao conectar via SSH ao servidor Debian: ' + error.message });
  }
};

const handleHostnameChange = async (req, res) => {
  const { newHostname } = req.body;

  if (!newHostname) {
    return res.status(400).json({ error: 'O novo nome do host (newHostname) é obrigatório.' });
  }

  try {
    const result = await changeAndRestoreHostname(newHostname);
    return res.json({
      message: 'Operação de alteração e restauração de Hostname executada com sucesso via SSH!',
      result
    });
  } catch (error) {
    console.error('Erro na alteração de Hostname via SSH:', error);
    return res.status(500).json({ error: 'Erro ao executar operação via SSH: ' + error.message });
  }
};

module.exports = { getSshInfo, handleHostnameChange };