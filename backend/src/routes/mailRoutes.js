const express = require('express');
const router = express.Router();
const { getEmails, sendEmail } = require('../controllers/mailController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getEmails); // Todos os autenticados consultam

router.post(
  '/send',
  verifyToken,
  checkRole(['admin', 'operador']), // Apenas Admin e Operador podem enviar
  sendEmail
);

module.exports = router;