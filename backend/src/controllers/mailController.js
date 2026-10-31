const { getImapMessages, sendSmtpMail } = require('../services/mailService');

const getEmails = async (req, res) => {
  const { account, password, folder } = req.query;

  if (!account || !password) {
    return res.status(400).json({ error: 'E-mail e palavra-passe são obrigatórios.' });
  }

  try {
    const messages = await getImapMessages(account, password, folder || 'INBOX');
    return res.json({ account, folder: folder || 'INBOX', messages });
  } catch (error) {
    console.error('Erro de Autenticação IMAP:', error.message);
    return res.status(401).json({ error: 'Credenciais inválidas ou erro no serviço Dovecot.' });
  }
};

const sendEmail = async (req, res) => {
  const { account, password, to, subject, bodyText } = req.body;

  if (!account || !password || !to || !subject || !bodyText) {
    return res.status(400).json({ error: 'Todos os campos do e-mail são obrigatórios.' });
  }

  try {
    await sendSmtpMail(account, password, to, subject, bodyText);
    return res.json({ message: 'E-mail enviado com sucesso via SMTP!' });
  } catch (error) {
    console.error('Erro de Envio SMTP:', error.message);
    return res.status(500).json({ error: 'Falha ao enviar e-mail via Postfix.' });
  }
};

module.exports = { getEmails, sendEmail };