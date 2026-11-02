const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Gestão de utilizadores restrita ao perfil administrador
router.get('/', verifyToken, checkRole(['admin']), getUsers);
router.post('/', verifyToken, checkRole(['admin']), createUser);
router.put('/:id', verifyToken, checkRole(['admin']), updateUser);
router.delete('/:id', verifyToken, checkRole(['admin']), deleteUser);

module.exports = router;
