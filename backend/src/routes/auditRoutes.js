const router = require('express').Router();
const { getAuditEvents } = require('../controllers/auditController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, checkRole(['admin']), getAuditEvents);

module.exports = router;
