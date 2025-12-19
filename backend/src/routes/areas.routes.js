const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const areasController = require('../controllers/areas.controller');
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
 * @route   GET /api/areas
 * @desc    Obtener todas las áreas (filtradas según permisos del usuario)
 * @access  Private
 */
router.get('/',
  verifyToken,
  asyncHandler(areasController.getAll)
);

/**
 * @route   GET /api/areas/:id
 * @desc    Obtener un área por ID
 * @access  Private
 */
router.get('/:id',
  verifyToken,
  param('id').notEmpty().withMessage('ID de área requerido'),
  handleValidation,
  asyncHandler(areasController.getById)
);

/**
 * @route   POST /api/areas
 * @desc    Crear una nueva área
 * @access  Private (Admin)
 */
router.post('/',
  verifyToken,
  requireAdmin,
  body('name')
    .notEmpty()
    .withMessage('El nombre del área es requerido')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('campos')
    .optional()
    .isArray()
    .withMessage('Los campos deben ser un array'),
  handleValidation,
  asyncHandler(areasController.create)
);

/**
 * @route   PUT /api/areas/:id
 * @desc    Actualizar un área
 * @access  Private (Admin)
 */
router.put('/:id',
  verifyToken,
  requireAdmin,
  param('id').notEmpty().withMessage('ID de área requerido'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  handleValidation,
  asyncHandler(areasController.update)
);

/**
 * @route   DELETE /api/areas/:id
 * @desc    Eliminar un área
 * @access  Private (Admin)
 */
router.delete('/:id',
  verifyToken,
  requireAdmin,
  param('id').notEmpty().withMessage('ID de área requerido'),
  handleValidation,
  asyncHandler(areasController.delete)
);

module.exports = router;
