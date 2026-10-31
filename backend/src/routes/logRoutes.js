const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/logController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Apenas administradores e operadores podem visualizar logs do sistema
router.get('/', verifyToken, checkRole(['admin', 'operador']), getLogs);

module.exports = router;