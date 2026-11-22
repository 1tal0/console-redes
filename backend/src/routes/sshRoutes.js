const express = require('express');
const router = express.Router();
const { getSshInfo, handleHostnameChange } = require('../controllers/sshController');
const { verifyToken, requirePermission } = require('../middleware/authMiddleware');

router.get('/info', verifyToken, requirePermission('ssh.read'), getSshInfo);

router.post(
  '/hostname',
  verifyToken,
  requirePermission('ssh.hostname'),
  handleHostnameChange
);

module.exports = router;
