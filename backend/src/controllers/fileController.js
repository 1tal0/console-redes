const { listFiles, uploadFile, downloadFileStream, checkExistingFileIntegrity, sanitizeFtpFilename } = require('../services/ftpService');
const fs = require('fs');
const crypto = require('crypto');

const rejectUnsafeName = (filename, res) => {
  try {
    return sanitizeFtpFilename(filename);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Nome de arquivo inválido.' });
    return null;
  }
};

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
  const originalName = rejectUnsafeName(req.file.originalname, res);
  if (!originalName) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return;
  }

  try {
    const localBuffer = fs.readFileSync(localFilePath);
    const localSha256 = crypto.createHash('sha256').update(localBuffer).digest('hex');

    await uploadFile(localFilePath, originalName);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

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
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro no upload FTP:', error);
    return res.status(500).json({ error: 'Erro ao transferir arquivo ao servidor FTP.' });
  }
};

const handleDownload = async (req, res) => {
  const filename = rejectUnsafeName(req.params.filename, res);
  if (!filename) return;

  try {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    await downloadFileStream(filename, res);
  } catch (error) {
    console.error('Erro ao baixar arquivo via FTP:', error);
    if (!res.headersSent) {
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Falha ao realizar download via FTP.' });
    }
  }
};

const checkIntegrity = async (req, res) => {
  const filename = rejectUnsafeName(req.params.filename, res);
  if (!filename) return;

  try {
    const result = await checkExistingFileIntegrity(filename);
    return res.json(result);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Falha ao verificar publicação HTTP/Integridade.' });
  }
};

module.exports = { getFileList, handleUpload, handleDownload, checkIntegrity };
