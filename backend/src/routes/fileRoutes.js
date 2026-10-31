const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getFileList, handleUpload, checkIntegrity } = require('../controllers/fileController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Configuração do Multer para salvamento temporário
const upload = multer({ dest: path.resolve(__dirname, '../../uploads') });

// Rotas
router.get('/', verifyToken, getFileList); // Todos autenticados podem ver

router.get('/integrity/:filename', verifyToken, checkIntegrity); // Nova rota de integridade

router.post(
  '/upload', 
  verifyToken, 
  checkRole(['admin', 'operador']), // Apenas Admin e Operador
  upload.single('file'), 
  handleUpload
);

module.exports = router;