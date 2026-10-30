const express = require('express');
const router = express.Router();
const { getMetrics } = require('../controllers/metricsController');
const { verifyToken } = require('../middleware/authMiddleware');

// Rota protegida: Exige apenas token válido
router.get('/', verifyToken, getMetrics);

module.exports = router;