require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'secret_key_console_n2_ifce',
  ftp: {
    host: process.env.FTP_HOST || '192.168.100.10',
    port: Number(process.env.FTP_PORT || 21),
    user: process.env.FTP_USER || 'ftpuser',
    password: process.env.FTP_PASS || 'ftp',
    secure: false
  }
};
