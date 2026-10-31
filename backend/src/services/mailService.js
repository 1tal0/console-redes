const Imap = require('imap');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');

// 1. Consultar mensagens no Dovecot IMAP com leitura completa do Stream
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
      // Mapeamento de pastas flexível (INBOX, Sent, Sent Messages)
      const targetFolder = (folder.toUpperCase() === 'SENT') ? 'Sent' : folder;

      imap.openBox(targetFolder, true, (err, box) => {
        if (err) {
          // Se 'Sent' não existir diretamente, tenta 'INBOX.Sent'
          if (folder === 'Sent') {
            return imap.openBox('INBOX.Sent', true, (err2, box2) => {
              if (err2) {
                imap.end();
                return resolve([]);
              }
              fetchBoxMessages(imap, box2, resolve, reject);
            });
          }
          imap.end();
          return reject(err);
        }

        fetchBoxMessages(imap, box, resolve, reject);
      });
    });

    imap.once('error', (err) => {
      reject(new Error('Falha na autenticação IMAP ou palavra-passe incorreta.'));
    });

    imap.connect();
  });
};

// Função auxiliar para buscar e parsear todas as mensagens sem perder streams
const fetchBoxMessages = (imap, box, resolve, reject) => {
  if (box.total === 0) {
    imap.end();
    return resolve([]);
  }

  const fetch = imap.seq.fetch(`1:${box.total}`, { bodies: '' });
  const parsePromises = [];

  fetch.on('message', (msg) => {
    const p = new Promise((resMsg) => {
      msg.on('body', (stream) => {
        simpleParser(stream, (err, parsed) => {
          if (err) {
            resMsg(null);
          } else {
            resMsg({
              id: parsed.messageId,
              from: parsed.from?.text || '',
              to: parsed.to?.text || '',
              subject: parsed.subject || '(sem assunto)',
              date: parsed.date || new Date(),
              text: parsed.text || '',
              html: parsed.html || false
            });
          }
        });
      });
    });
    parsePromises.push(p);
  });

  fetch.once('end', async () => {
    try {
      const results = await Promise.all(parsePromises);
      // Filtra falhas e ordena do mais recente para o mais antigo
      const validMessages = results.filter(Boolean).reverse();
      imap.end();
      resolve(validMessages);
    } catch (e) {
      imap.end();
      reject(e);
    }
  });

  fetch.once('error', (err) => {
    imap.end();
    reject(err);
  });
};

// 2. Enviar E-mail via SMTP Postfix e anexar cópia na pasta Sent do Dovecot
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

  // Copiar o e-mail enviado para a caixa 'Sent' via IMAP (APPEND)
  appendSentFolder(account, password, mailOptions).catch(() => {});

  return info;
};

// Salvar mensagem enviada na pasta Sent via IMAP
const appendSentFolder = (account, password, mailOptions) => {
  return new Promise((resolve) => {
    const username = account.split('@')[0];
    const imap = new Imap({
      user: username,
      password: password,
      host: '192.168.100.10',
      port: 143,
      tls: false
    });

    const rawMessage = `From: ${mailOptions.from}\r\nTo: ${mailOptions.to}\r\nSubject: ${mailOptions.subject}\r\nDate: ${new Date().toUTCString()}\r\n\r\n${mailOptions.text}`;

    imap.once('ready', () => {
      imap.openBox('Sent', false, (err) => {
        if (err) {
          imap.end();
          return resolve();
        }
        imap.append(rawMessage, { mailbox: 'Sent', flags: ['\\Seen'] }, () => {
          imap.end();
          resolve();
        });
      });
    });

    imap.once('error', () => resolve());
    imap.connect();
  });
};

module.exports = { getImapMessages, sendSmtpMail };