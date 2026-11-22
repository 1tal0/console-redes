const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/logController');
const { verifyToken, requirePermission } = require('../middleware/authMiddleware');

router.get('/', verifyToken, requirePermission('logs.read'), getLogs);

module.exports = router;
