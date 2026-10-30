const express = require('express');
const router = express.Router();
const { getMailbox, handleSendEmail } = require('../controllers/mailController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getMailbox); // Todos os autenticados consultam

router.post(
  '/send',
  verifyToken,
  checkRole(['admin', 'operador']), // Apenas Admin e Operador podem enviar
  handleSendEmail
);

module.exports = router;