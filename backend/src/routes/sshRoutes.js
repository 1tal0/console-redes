const express = require('express');
const router = express.Router();
const { getSshInfo, handleHostnameChange } = require('../controllers/sshController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/info', verifyToken, getSshInfo); // Todos consultam

router.post(
  '/hostname',
  verifyToken,
  checkRole(['admin']), // Apenas o perfil ADMIN pode alterar o hostname
  handleHostnameChange
);

module.exports = router;