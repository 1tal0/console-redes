const ftp = require('basic-ftp');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { ftp: ftpEnv } = require('../config/env');

const FTP_CONFIG = {
  host: ftpEnv.host,
  port: ftpEnv.port,
  user: ftpEnv.user,
  password: ftpEnv.password,
  secure: ftpEnv.secure
};

const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;

const sanitizeFtpFilename = (filename) => {
  if (typeof filename !== 'string' || !filename.trim()) {
    const error = new Error('Nome de arquivo inválido.');
    error.statusCode = 400;
    throw error;
  }

  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    const error = new Error('Caminho de arquivo não permitido.');
    error.statusCode = 400;
    throw error;
  }

  const safe = path.basename(filename);
  if (!SAFE_FILENAME.test(safe)) {
    const error = new Error('Nome de arquivo contém caracteres não permitidos.');
    error.statusCode = 400;
    throw error;
  }

  return safe;
};

const listFiles = async () => {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access(FTP_CONFIG);
    const list = await client.list('/arquivos');
    return list.map(item => ({
      name: item.name,
      size: item.size,
      modifiedAt: item.rawModifiedAt || item.date,
      type: item.isDirectory ? 'directory' : 'file'
    }));
  } finally {
    client.close();
  }
};

const uploadFile = async (localFilePath, originalName) => {
  const safeName = sanitizeFtpFilename(originalName);
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access(FTP_CONFIG);
    await client.uploadFrom(localFilePath, `/arquivos/${safeName}`);
    return { success: true, filename: safeName };
  } finally {
    client.close();
  }
};

const downloadFileStream = async (filename, res) => {
  const safeName = sanitizeFtpFilename(filename);
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access(FTP_CONFIG);
    await client.downloadTo(res, `/arquivos/${safeName}`);
  } finally {
    client.close();
  }
};

const checkExistingFileIntegrity = async (filename) => {
  const safeName = sanitizeFtpFilename(filename);
  const httpResponse = await axios.get(`http://192.168.100.10/arquivos/${encodeURIComponent(safeName)}`, {
    responseType: 'arraybuffer'
  });

  const httpHashSum = crypto.createHash('sha256');
  httpHashSum.update(httpResponse.data);
  const sha256 = httpHashSum.digest('hex');

  return {
    filename: safeName,
    sha256,
    httpUrl: `http://192.168.100.10/arquivos/${encodeURIComponent(safeName)}`,
    status: 'ok'
  };
};

module.exports = { listFiles, uploadFile, downloadFileStream, checkExistingFileIntegrity, sanitizeFtpFilename };
