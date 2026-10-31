const express = require('express');
const router = express.Router();
const { getEmails, getEmail, sendEmail } = require('../controllers/mailController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getEmails);
router.get('/message', verifyToken, getEmail);
router.post('/send', verifyToken, sendEmail);

module.exports = router;