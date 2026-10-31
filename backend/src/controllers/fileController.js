const { listFiles, uploadFile, downloadFileStream, checkExistingFileIntegrity } = require('../services/ftpService');
const fs = require('fs');
const crypto = require('crypto');

const getFileList = async (req, res) => {
  try {
    const files = await listFiles();
    return res.json({ files });
  } catch (error) {
    console.error('Erro ao listar arquivos FTP:', error);
    return res.status(500).json({ error: 'Falha ao conectar ao servidor FTP vsftpd.' });
  }
};

const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const localFilePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    // Hash local antes do envio
    const localBuffer = fs.readFileSync(localFilePath);
    const localSha256 = crypto.createHash('sha256').update(localBuffer).digest('hex');

    // Transferência via FTP
    await uploadFile(localFilePath, originalName);

    // Remover temporário local do Multer
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    // Validação automática de publicação HTTP Apache
    const integrity = await checkExistingFileIntegrity(originalName);

    return res.json({
      message: 'Arquivo transferido com sucesso ao vsftpd!',
      filename: originalName,
      size: req.file.size,
      sha256: integrity.sha256,
      integrityMatch: localSha256 === integrity.sha256,
      httpUrl: integrity.httpUrl
    });
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error('Erro no upload FTP:', error);
    return res.status(500).json({ error: 'Erro ao transferir arquivo ao servidor FTP.' });
  }
};

const handleDownload = async (req, res) => {
  const { filename } = req.params;
  if (!filename) {
    return res.status(400).json({ error: 'Nome do arquivo é obrigatório.' });
  }

  try {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    await downloadFileStream(filename, res);
  } catch (error) {
    console.error('Erro ao baixar arquivo via FTP:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Falha ao realizar download via FTP.' });
    }
  }
};

const checkIntegrity = async (req, res) => {
  const { filename } = req.params;
  try {
    const result = await checkExistingFileIntegrity(filename);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao verificar publicação HTTP/Integridade.' });
  }
};

module.exports = { getFileList, handleUpload, handleDownload, checkIntegrity };