const express = require('express');
const router = express.Router();
const { login, logout, me } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);

module.exports = router;
