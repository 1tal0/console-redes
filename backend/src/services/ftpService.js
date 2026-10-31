const ftp = require('basic-ftp');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { PassThrough } = require('stream');

const FTP_CONFIG = {
  host: '192.168.100.10',
  port: 21,
  user: 'ftpuser',
  password: 'ftp',
  secure: false
};

// 1. Listar arquivos remotos do diretório /arquivos
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

// 2. Upload de arquivo via FTP (sem salvar diretamente no disco do servidor web)
const uploadFile = async (localFilePath, originalName) => {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access(FTP_CONFIG);
    await client.uploadFrom(localFilePath, `/arquivos/${originalName}`);
    return { success: true, filename: originalName };
  } finally {
    client.close();
  }
};

// 3. Obter Stream para Download via FTP pelo Console
const downloadFileStream = async (filename, res) => {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access(FTP_CONFIG);
    // No basic-ftp, passar a Writable Stream (res) diretamente no downloadTo faz a transferência via stream
    await client.downloadTo(res, `/arquivos/${filename}`);
  } finally {
    client.close();
  }
};

// 4. Validação de Integridade: Compara Hash do Upload com o Hash baixado via HTTP Apache
const checkExistingFileIntegrity = async (filename) => {
  const httpResponse = await axios.get(`http://192.168.100.10/arquivos/${encodeURIComponent(filename)}`, {
    responseType: 'arraybuffer'
  });

  const httpHashSum = crypto.createHash('sha256');
  httpHashSum.update(httpResponse.data);
  const sha256 = httpHashSum.digest('hex');

  return {
    filename,
    sha256,
    httpUrl: `http://192.168.100.10/arquivos/${encodeURIComponent(filename)}`,
    status: 'ok'
  };
};

module.exports = { listFiles, uploadFile, downloadFileStream, checkExistingFileIntegrity };