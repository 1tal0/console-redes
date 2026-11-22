const router = require('express').Router();
const { executeServiceAction } = require('../controllers/serviceController');
const { verifyToken, requirePermission } = require('../middleware/authMiddleware');

router.post('/:serviceName/:action', verifyToken, requirePermission(req => `services.${req.params.serviceName}.${req.params.action}`), executeServiceAction);

module.exports = router;
