const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getFileList, handleUpload, handleDownload, checkIntegrity } = require('../controllers/fileController');
const { verifyToken, requirePermission } = require('../middleware/authMiddleware');

const upload = multer({ dest: path.resolve(__dirname, '../../uploads') });

router.get('/', verifyToken, requirePermission('ftp.read'), getFileList);

router.get('/download/:filename', verifyToken, requirePermission('ftp.read'), handleDownload); // Download via FTP pelo Console

router.get('/integrity/:filename', verifyToken, requirePermission('ftp.read'), checkIntegrity);

router.post(
  '/upload', 
  verifyToken, 
  requirePermission('ftp.upload'),
  upload.single('file'), 
  handleUpload
);

module.exports = router;