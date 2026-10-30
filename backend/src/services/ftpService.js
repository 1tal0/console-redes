const ftp = require('basic-ftp');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

const FTP_CONFIG = {
  host: '192.168.100.10',
  port: 21,
  user: 'ftpuser',
  password: 'ftp', // Palavra-passe configurada na N1
  secure: false
};

// Conectar ao FTP e listar arquivos do diretório publicado
const listFiles = async () => {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access(FTP_CONFIG);
    const list = await client.list('/arquivos');
    return list.map(item => ({
      name: item.name,
      size: item.size,
      date: item.rawModifiedAt || item.date,
      type: item.isDirectory ? 'directory' : 'file'
    }));
  } finally {
    client.close();
  }
};

// Enviar arquivo recebido via formulário para o FTP
const uploadFile = async (localFilePath, originalName) => {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access(FTP_CONFIG);
    // Envia o arquivo temporário salvo pelo Multer diretamente ao FTP passivo
    await client.uploadFrom(localFilePath, `/arquivos/${originalName}`);
    return { success: true, filename: originalName };
  } finally {
    client.close();
  }
};

// Calcula Hash SHA-256 de um arquivo local
const getLocalHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
};

// Baixa arquivo via HTTP Apache e calcula Hash SHA-256 para integridade
const checkHttpIntegrity = async (filename, localFilePath) => {
  const originalHash = getLocalHash(localFilePath);
  try {
    const httpResponse = await axios.get(`http://192.168.100.10/arquivos/${filename}`, {
      responseType: 'arraybuffer'
    });
    
    const httpHashSum = crypto.createHash('sha256');
    httpHashSum.update(httpResponse.data);
    const httpHash = httpHashSum.digest('hex');

    return {
      match: originalHash === httpHash,
      originalHash,
      httpHash
    };
  } catch (error) {
    return {
      match: false,
      originalHash,
      httpHash: 'erro_ao_baixar_http'
    };
  }
};

module.exports = { listFiles, uploadFile, checkHttpIntegrity };