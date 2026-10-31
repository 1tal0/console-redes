const { listEmails, getEmail: getEmailService, sendEmail: sendEmailService } = require('../services/mailService');

// Traduz erros do imapflow para respostas HTTP
const handleImapError = (error, res) => {
  console.error('Erro IMAP:', error.message);

  if (error.authenticationFailed) {
    return res.status(401).json({ error: 'Credenciais inválidas ou erro no serviço Dovecot.' });
  }

  if (error.notFound) {
    return res.status(404).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Falha ao comunicar com o serviço IMAP (Dovecot).' });
};

// GET /mail?account=&password=&folder=
const getEmails = async (req, res) => {
  const { account, password, folder } = req.query;

  if (!account || !password) {
    return res.status(400).json({ error: 'E-mail e palavra-passe são obrigatórios.' });
  }

  try {
    const messages = await listEmails(account, password, folder || 'INBOX');
    return res.json({ account, folder: folder || 'INBOX', total: messages.length, messages });
  } catch (error) {
    return handleImapError(error, res);
  }
};

// GET /mail/message?account=&password=&folder=&uid=
const getEmail = async (req, res) => {
  const { account, password, folder, uid } = req.query;

  if (!account || !password || !uid) {
    return res.status(400).json({ error: 'E-mail, palavra-passe e UID são obrigatórios.' });
  }

  try {
    const message = await getEmailService(account, password, folder || 'INBOX', uid);
    return res.json({ message });
  } catch (error) {
    return handleImapError(error, res);
  }
};

// POST /mail/send
const sendEmail = async (req, res) => {
  const { account, password, to, subject, bodyText } = req.body;

  if (!account || !password || !to || !subject || !bodyText) {
    return res.status(400).json({ error: 'Todos os campos do e-mail são obrigatórios.' });
  }

  try {
    const result = await sendEmailService(account, password, to, subject, bodyText);
    return res.json({ message: 'E-mail enviado com sucesso via SMTP!', ...result });
  } catch (error) {
    // O service lança { stage, error } quando falha no SMTP
    console.error(`Erro de Envio ${error.stage || 'SMTP'}:`, error.error || error.message);
    return res.status(500).json({ error: 'Falha ao enviar e-mail via Postfix.' });
  }
};

module.exports = { getEmails, getEmail, sendEmail };