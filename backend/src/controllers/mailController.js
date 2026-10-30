const { sendEmail, listEmails } = require('../services/mailService');

const getMailbox = async (req, res) => {
  const { account, password, folder } = req.query;

  if (!account || !password) {
    return res.status(400).json({ error: 'Conta de e-mail e palavra-passe são obrigatórias.' });
  }

  try {
    const messages = await listEmails(account, password, folder || 'INBOX');
    return res.json({ account, folder: folder || 'INBOX', count: messages.length, messages });
  } catch (error) {
    console.error('Erro ao consultar IMAP:', error);
    return res.status(500).json({ error: 'Falha na autenticação ou consulta da caixa de correio no Dovecot.' });
  }
};

const handleSendEmail = async (req, res) => {
  const { account, password, to, subject, bodyText } = req.body;

  if (!account || !password || !to || !subject || !bodyText) {
    return res.status(400).json({ error: 'Campos obrigatórios: account, password, to, subject e bodyText.' });
  }

  try {
    const result = await sendEmail(account, password, to, subject, bodyText);
    return res.json({
      message: 'Operação de e-mail concluída.',
      result
    });
  } catch (err) {
    console.error('Erro na operação de e-mail:', err);
    if (err.stage === 'SMTP') {
      return res.status(500).json({ error: 'Falha no envio via SMTP (Postfix): ' + err.error });
    }
    return res.status(500).json({ error: 'Erro interno no processamento de e-mail.' });
  }
};

module.exports = { getMailbox, handleSendEmail };