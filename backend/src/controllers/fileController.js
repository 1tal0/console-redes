const { listFiles, uploadFile, checkHttpIntegrity } = require('../services/ftpService');
const fs = require('fs');

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
    // 1. Upload via FTP
    await uploadFile(localFilePath, originalName);

    // 2. Testar integração automática HTTP e comparar SHA-256
    const integrity = await checkHttpIntegrity(originalName, localFilePath);

    // 3. Remover arquivo temporário local do backend
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return res.json({
      message: 'Arquivo enviado com sucesso via FTP!',
      filename: originalName,
      size: req.file.size,
      integrity
    });
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error('Erro no upload FTP:', error);
    return res.status(500).json({ error: 'Erro ao transferir arquivo ao servidor FTP.' });
  }
};

module.exports = { getFileList, handleUpload };