const Imap = require('imap');
const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');
const { simpleParser } = require('mailparser');

// 1. Consultar mensagens IMAP do Dovecot
const getImapMessages = (account, password, folder = 'INBOX') => {
  return new Promise((resolve, reject) => {
    const username = account.split('@')[0];

    const imap = new Imap({
      user: username,
      password: password,
      host: '192.168.100.10',
      port: 143,
      tls: false,
      authTimeout: 5000
    });

    imap.once('ready', () => {
      imap.openBox(folder, true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        if (box.total === 0) {
          imap.end();
          return resolve([]);
        }

        const fetch = imap.seq.fetch(`1:${box.total}`, { bodies: '' });
        const parsingTasks = [];

        fetch.on('message', (msg) => {
          // Cada mensagem gera uma Promise que só resolve quando o parse termina
          const task = new Promise((resolveMsg) => {
            msg.on('body', (stream) => {
              simpleParser(stream)
                .then((parsed) => {
                  resolveMsg({
                    id: parsed.messageId,
                    from: parsed.from?.text || '',
                    to: parsed.to?.text || '',
                    subject: parsed.subject || '(sem assunto)',
                    date: parsed.date || new Date(),
                    text: parsed.text || '',
                    html: parsed.html || false
                  });
                })
                .catch(() => resolveMsg(null));
            });
          });

          parsingTasks.push(task);
        });

        fetch.once('error', (err) => {
          imap.end();
          reject(err);
        });

        fetch.once('end', async () => {
          imap.end();

          // Aguarda o parse de TODAS as mensagens antes de responder
          const results = await Promise.all(parsingTasks);

          const messages = results
            .filter(Boolean)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // mais recentes primeiro

          resolve(messages);
        });
      });
    });

    imap.once('error', (err) => {
      reject(new Error('Falha na autenticação IMAP ou palavra-passe incorreta.'));
    });

    imap.connect();
  });
};

// 2. Guardar cópia do e-mail enviado na pasta Sent (via IMAP APPEND)
const appendToSent = (account, password, mailOptions, folder = 'Sent') => {
  return new Promise((resolve, reject) => {
    const username = account.split('@')[0];

    const imap = new Imap({
      user: username,
      password: password,
      host: '192.168.100.10',
      port: 143,
      tls: false,
      authTimeout: 5000
    });

    imap.once('ready', () => {
      new MailComposer(mailOptions).compile().build((err, rawMessage) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        imap.append(rawMessage, { mailbox: folder, flags: ['\\Seen'] }, (err) => {
          imap.end();
          if (err) return reject(err);
          resolve();
        });
      });
    });

    imap.once('error', (err) => reject(err));

    imap.connect();
  });
};

// 3. Enviar E-mail via SMTP Postfix
const sendSmtpMail = async (account, password, to, subject, bodyText) => {
  const username = account.split('@')[0];

  const transporter = nodemailer.createTransport({
    host: '192.168.100.10',
    port: 25,
    secure: false,
    auth: {
      user: username,
      pass: password
    },
    tls: { rejectUnauthorized: false }
  });

  const mailOptions = {
    from: account,
    to,
    subject,
    text: bodyText
  };

  const info = await transporter.sendMail(mailOptions);

  // Salva cópia no Sent sem derrubar o envio caso falhe
  try {
    await appendToSent(account, password, mailOptions);
  } catch (error) {
    console.error('Erro ao salvar cópia na pasta Sent:', error.message);
  }

  return info;
};

module.exports = { getImapMessages, sendSmtpMail };