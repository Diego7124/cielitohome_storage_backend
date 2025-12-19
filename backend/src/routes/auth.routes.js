const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/auth/verify
 * @desc    Verificar token de Firebase y obtener datos del usuario
 * @access  Private
 */
router.post('/verify',
  verifyToken,
  asyncHandler(authController.verifyToken)
);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener información del usuario autenticado
 * @access  Private
 */
router.get('/me',
  verifyToken,
  asyncHandler(authController.getMe)
);

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario (solo crea el registro en Firestore)
 * @access  Private
 */
router.post('/register',
  verifyToken,
  asyncHandler(authController.register)
);

module.exports = router;
