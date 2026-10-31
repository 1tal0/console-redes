const Imap = require('imap');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');

// 1. Validar e Buscar Mensagens IMAP
const getImapMessages = (account, password, folder = 'INBOX') => {
  return new Promise((resolve, reject) => {
    // Extrai o nome do utilizador do e-mail (ex: aluno@empresa.test -> aluno)
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
        const messages = [];

        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            simpleParser(stream, async (err, parsed) => {
              if (!err) {
                messages.push({
                  id: parsed.messageId,
                  from: parsed.from?.text || '',
                  to: parsed.to?.text || '',
                  subject: parsed.subject || '(sem assunto)',
                  date: parsed.date,
                  text: parsed.text || '',
                  html: parsed.html || false
                });
              }
            });
          });
        });

        fetch.once('end', () => {
          imap.end();
          // Ordena dos mais recentes aos mais antigos
          setTimeout(() => {
            resolve(messages.reverse());
          }, 500);
        });
      });
    });

    imap.once('error', (err) => {
      reject(new Error('Falha na autenticação IMAP ou palavra-passe incorreta.'));
    });

    imap.connect();
  });
};

// 2. Enviar E-mail via SMTP Postfix
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

  return await transporter.sendMail(mailOptions);
};

module.exports = { getImapMessages, sendSmtpMail };