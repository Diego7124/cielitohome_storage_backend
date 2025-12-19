const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Middleware para manejar errores de validación
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @route   GET /api/usuarios
 * @desc    Obtener todos los usuarios
 * @access  Private (Admin)
 */
router.get('/',
  verifyToken,
  requireAdmin,
  asyncHandler(usuariosController.getAll)
);

/**
 * @route   GET /api/usuarios/me
 * @desc    Obtener datos del usuario actual
 * @access  Private
 */
router.get('/me',
  verifyToken,
  asyncHandler(usuariosController.getCurrentUser)
);

/**
 * @route   GET /api/usuarios/:id
 * @desc    Obtener un usuario por ID
 * @access  Private (Admin)
 */
router.get('/:id',
  verifyToken,
  requireAdmin,
  param('id').notEmpty().withMessage('ID de usuario requerido'),
  handleValidation,
  asyncHandler(usuariosController.getById)
);

/**
 * @route   POST /api/usuarios
 * @desc    Crear un nuevo usuario
 * @access  Private (Admin)
 */
router.post('/',
  verifyToken,
  requireAdmin,
  body('email')
    .isEmail()
    .withMessage('Email válido requerido')
    .normalizeEmail(),
  body('rol')
    .isIn(['admin', 'inventario', 'usuario'])
    .withMessage('Rol inválido. Debe ser: admin, inventario o usuario'),
  body('areasPermitidas')
    .optional()
    .isArray()
    .withMessage('areasPermitidas debe ser un array'),
  handleValidation,
  asyncHandler(usuariosController.create)
);

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Actualizar un usuario
 * @access  Private (Admin)
 */
router.put('/:id',
  verifyToken,
  requireAdmin,
  param('id').notEmpty().withMessage('ID de usuario requerido'),
  body('rol')
    .optional()
    .isIn(['admin', 'inventario', 'usuario'])
    .withMessage('Rol inválido'),
  body('areasPermitidas')
    .optional()
    .isArray()
    .withMessage('areasPermitidas debe ser un array'),
  handleValidation,
  asyncHandler(usuariosController.update)
);

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Eliminar un usuario
 * @access  Private (Admin)
 */
router.delete('/:id',
  verifyToken,
  requireAdmin,
  param('id').notEmpty().withMessage('ID de usuario requerido'),
  handleValidation,
  asyncHandler(usuariosController.delete)
);

module.exports = router;
