const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getFileList, handleUpload, handleDownload, checkIntegrity } = require('../controllers/fileController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

const upload = multer({ dest: path.resolve(__dirname, '../../uploads') });

router.get('/', verifyToken, getFileList);

router.get('/download/:filename', verifyToken, handleDownload); // Download via FTP pelo Console

router.get('/integrity/:filename', verifyToken, checkIntegrity);

router.post(
  '/upload', 
  verifyToken, 
  checkRole(['admin', 'operador']),
  upload.single('file'), 
  handleUpload
);

module.exports = router;