const express = require('express');
const router = express.Router();
const { getEmails, getEmail, sendEmail } = require('../controllers/mailController');
const { verifyToken, requirePermission } = require('../middleware/authMiddleware');

router.get('/', verifyToken, requirePermission('mail.read'), getEmails);
router.get('/message', verifyToken, requirePermission('mail.read'), getEmail);
router.post('/send', verifyToken, requirePermission('mail.send'), sendEmail);

module.exports = router;
