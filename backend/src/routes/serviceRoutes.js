const router = require('express').Router();
const { executeServiceAction } = require('../controllers/serviceController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.post('/:serviceName/:action', verifyToken, checkRole(['admin', 'operador']), executeServiceAction);

module.exports = router;
