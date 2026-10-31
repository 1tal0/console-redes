const crypto = require('crypto');
const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// Extrai o nome de utilizador do Linux (ex: "aluno@empresa.test" -> "aluno")
const getSystemUsername = (account) => {
  return account.includes('@') ? account.split('@')[0] : account;
};

// Formata a lista de endereços do envelope: "Nome <email>" (para exibição)
const formatAddresses = (list) => {
  return (list || [])
    .map((a) => (a.name ? `${a.name} <${a.address}>` : a.address))
    .join(', ');
};

// Apenas os e-mails puros (para preencher o campo "Para" ao responder)
const plainAddresses = (list) => {
  return (list || [])
    .map((a) => a.address)
    .filter(Boolean)
    .join(', ');
};

// Configuração SMTP local do Postfix
const createSmtpTransporter = (account, pass) => {
  return nodemailer.createTransport({
    host: '192.168.100.10',
    port: 25,
    secure: false,
    auth: { user: getSystemUsername(account), pass },
    tls: { rejectUnauthorized: false }
  });
};

// Configuração cliente IMAP do Dovecot (utiliza a conta PAM local)
const createImapClient = (account, pass) => {
  const client = new ImapFlow({
    host: '192.168.100.10',
    port: 143,
    secure: false,
    auth: { user: getSystemUsername(account), pass },
    tls: { rejectUnauthorized: false },
    logger: false
  });

  // Evita que erros de socket derrubem o processo do Node
  client.on('error', (err) => {
    console.error('[IMAP] Erro de ligação:', err.message);
  });

  return client;
};

// Encerra a ligação IMAP com segurança (mesmo se a autenticação falhou)
const closeImapClient = async (imapClient) => {
  try {
    if (imapClient.usable) await imapClient.logout();
  } catch (err) {
    console.error('[IMAP] Erro ao encerrar ligação:', err.message);
  }
};

// Descobre o caminho real da pasta no Dovecot (ex: "Sent" ou "INBOX.Sent").
// Retorna null caso a pasta não exista.
const resolveFolderPath = async (imapClient, folder) => {
  if (folder.toUpperCase() === 'INBOX') return 'INBOX';

  const wanted = folder.toLowerCase();
  const mailboxes = await imapClient.list();

  const found = mailboxes.find(
    (m) =>
      m.path.toLowerCase() === wanted ||
      m.name.toLowerCase() === wanted ||
      (wanted === 'sent' && m.specialUse === '\\Sent')
  );

  return found ? found.path : null;
};

// Gera a mensagem MIME completa (cabeçalhos codificados, UTF-8, Message-ID)
const buildRawMessage = (mailOptions) => {
  return new Promise((resolve, reject) => {
    new MailComposer(mailOptions).compile().build((err, message) => {
      if (err) return reject(err);
      resolve(message);
    });
  });
};

// 1. Enviar mensagem via SMTP e gravar cópia no IMAP (Sent)
const sendEmail = async (account, password, to, subject, bodyText) => {
  const user = account;
  const pass = password;
  const domain = user.includes('@') ? user.split('@')[1] : 'localhost';

  // As mesmas opções são usadas no SMTP e na cópia do Sent (mesmo Message-ID e data)
  const mailOptions = {
    from: user,
    to: to,
    subject: subject,
    text: bodyText,
    date: new Date(),
    messageId: `<${crypto.randomUUID()}@${domain}>`
  };

  // Passo A: Envio SMTP
  const transporter = createSmtpTransporter(user, pass);
  let mailResult;
  try {
    mailResult = await transporter.sendMail(mailOptions);
  } catch (smtpErr) {
    throw { stage: 'SMTP', error: smtpErr.message };
  }

  // Passo B: Apendar cópia na pasta Sent do IMAP
  const imapClient = createImapClient(user, pass);
  try {
    await imapClient.connect();

    let targetFolder = await resolveFolderPath(imapClient, 'Sent');

    // Se a pasta Sent ainda não existe nesta conta, cria
    if (!targetFolder) {
      targetFolder = 'Sent';
      await imapClient.mailboxCreate(targetFolder);
    }

    const rawMessage = await buildRawMessage(mailOptions);
    await imapClient.append(targetFolder, rawMessage, ['\\Seen']);
  } catch (imapErr) {
    return {
      success: true,
      smtpAccepted: mailResult.accepted,
      imapSaved: false,
      warning: 'E-mail enviado via SMTP com sucesso, mas falhou ao gravar na pasta Sent do IMAP: ' + imapErr.message
    };
  } finally {
    await closeImapClient(imapClient);
  }

  return {
    success: true,
    smtpAccepted: mailResult.accepted,
    imapSaved: true
  };
};

// 2. Listar mensagens de uma pasta (INBOX ou Sent) via IMAP — apenas cabeçalhos
const listEmails = async (account, password, folder = 'INBOX') => {
  const imapClient = createImapClient(account, password);

  try {
    await imapClient.connect();

    const targetFolder = await resolveFolderPath(imapClient, folder);

    // Pasta ainda inexistente (ex: conta nova sem Sent) = lista vazia
    if (!targetFolder) return [];

    const lock = await imapClient.getMailboxLock(targetFolder, { readOnly: true });
    const messages = [];

    try {
      if (imapClient.mailbox.exists > 0) {
        for await (const message of imapClient.fetch('1:*', { uid: true, envelope: true })) {
          const envelope = message.envelope || {};

          messages.push({
            id: envelope.messageId || `${targetFolder}-uid-${message.uid}`,
            uid: message.uid,
            seq: message.seq,
            from: formatAddresses(envelope.from),
            fromAddress: plainAddresses(envelope.from),
            to: formatAddresses(envelope.to),
            toAddress: plainAddresses(envelope.to),
            subject: envelope.subject || '(sem assunto)',
            date: envelope.date || null
          });
        }
      }
    } finally {
      lock.release();
    }

    // Mais recentes primeiro
    return messages.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  } finally {
    await closeImapClient(imapClient);
  }
};

// 3. Ler uma mensagem completa (corpo) pelo UID
const getEmail = async (account, password, folder = 'INBOX', uid) => {
  const imapClient = createImapClient(account, password);

  try {
    await imapClient.connect();

    const targetFolder = await resolveFolderPath(imapClient, folder);

    if (!targetFolder) {
      throw Object.assign(new Error('Pasta não encontrada.'), { notFound: true });
    }

    const lock = await imapClient.getMailboxLock(targetFolder, { readOnly: true });

    try {
      const message = await imapClient.fetchOne(
        String(uid),
        { uid: true, envelope: true, source: true },
        { uid: true }
      );

      if (!message || !message.source) {
        throw Object.assign(new Error('Mensagem não encontrada.'), { notFound: true });
      }

      const parsed = await simpleParser(message.source);
      const envelope = message.envelope || {};

      return {
        id: parsed.messageId || `${targetFolder}-uid-${message.uid}`,
        uid: message.uid,
        from: parsed.from?.text || formatAddresses(envelope.from),
        fromAddress: plainAddresses(envelope.from),
        to: parsed.to?.text || formatAddresses(envelope.to),
        toAddress: plainAddresses(envelope.to),
        subject: parsed.subject || '(sem assunto)',
        date: parsed.date || envelope.date || null,
        text: parsed.text || '',
        html: parsed.html || false
      };
    } finally {
      lock.release();
    }
  } finally {
    await closeImapClient(imapClient);
  }
};

module.exports = { sendEmail, listEmails, getEmail };