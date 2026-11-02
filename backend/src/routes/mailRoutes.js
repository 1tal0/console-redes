const express = require('express');
const router = express.Router();
const { getEmails, getEmail, sendEmail } = require('../controllers/mailController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getEmails);
router.get('/message', verifyToken, getEmail);
router.post('/send', verifyToken, checkRole(['admin', 'operador']), sendEmail);

module.exports = router;
