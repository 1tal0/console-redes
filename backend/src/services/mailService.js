const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');

const createSmtpTransporter = (user, pass) => {
  return nodemailer.createTransport({
    host: '192.168.100.10',
    port: 25,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
};

const createImapClient = (user, pass) => {
  return new ImapFlow({
    host: '192.168.100.10',
    port: 143,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    logger: false
  });
};

// 1. Enviar mensagem via SMTP e gravar cópia no IMAP (Sent)
const sendEmail = async (account, password, to, subject, bodyText) => {
  const user = account;
  const pass = password;

  // Passo A: Envio SMTP
  const transporter = createSmtpTransporter(user, pass);
  let mailResult;
  try {
    mailResult = await transporter.sendMail({
      from: user,
      to: to,
      subject: subject,
      text: bodyText
    });
  } catch (smtpErr) {
    throw { stage: 'SMTP', error: smtpErr.message };
  }

  // Passo B: Apendar cópia na pasta Sent do IMAP
  const imapClient = createImapClient(user, pass);
  try {
    await imapClient.connect();

    // Garante que a pasta Sent existe ou cria se necessário
    const mailboxes = await imapClient.list();
    let targetFolder = mailboxes.find(m => m.name.toLowerCase() === 'sent' || m.path.toLowerCase() === 'sent')?.path || 'Sent';

    try {
      await imapClient.mailboxCreate(targetFolder);
    } catch (e) {
      // Pasta já existe
    }

    const rawMessage = Buffer.from(
      `From: ${user}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Date: ${new Date().toUTCString()}\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
      `${bodyText}`
    );

    await imapClient.append(targetFolder, rawMessage, ['\\Seen']);
    await imapClient.logout();
  } catch (imapErr) {
    return {
      success: true,
      smtpAccepted: mailResult.accepted,
      imapSaved: false,
      warning: 'E-mail enviado via SMTP com sucesso, mas falhou ao gravar na pasta Sent do IMAP: ' + imapErr.message
    };
  }

  return {
    success: true,
    smtpAccepted: mailResult.accepted,
    imapSaved: true
  };
};

// 2. Listar mensagens de uma pasta (INBOX ou Sent) via IMAP
const listEmails = async (account, password, folder = 'INBOX') => {
  const user = account;
  const pass = password;
  const imapClient = createImapClient(user, pass);

  try {
    await imapClient.connect();

    // Normaliza o nome da caixa (ex: Sent vs INBOX)
    let targetFolder = folder;
    if (folder.toLowerCase() === 'sent') {
      const mailboxes = await imapClient.list();
      targetFolder = mailboxes.find(m => m.name.toLowerCase() === 'sent' || m.path.toLowerCase() === 'sent')?.path || 'Sent';
    }

    const lock = await imapClient.getMailboxLock(targetFolder);
    const messages = [];

    try {
      // Verifica quantas mensagens existem antes de fazer a busca
      const status = await imapClient.status(targetFolder, { messages: true });
      
      if (status.messages > 0) {
        for await (let message of imapClient.fetch('1:*', { envelope: true })) {
          messages.push({
            uid: message.uid,
            seq: message.seq,
            from: message.envelope.from ? message.envelope.from[0].address : '',
            to: message.envelope.to ? message.envelope.to[0].address : '',
            subject: message.envelope.subject || '(sem assunto)',
            date: message.envelope.date
          });
        }
      }
    } finally {
      lock.release();
    }

    await imapClient.logout();
    return messages.reverse();
  } catch (error) {
    throw error;
  }
};

module.exports = { sendEmail, listEmails };