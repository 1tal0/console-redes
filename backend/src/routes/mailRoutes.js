const express = require('express');
const router = express.Router();
const { getEmails, sendEmail } = require('../controllers/mailController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getEmails);
router.post('/send', verifyToken, sendEmail);

module.exports = router;