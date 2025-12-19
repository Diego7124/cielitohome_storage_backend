const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const movimientosController = require('../controllers/movimientos.controller');
const { verifyToken, requireAdmin, requireAreaAccess } = require('../middleware/auth');
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
 * @route   GET /api/movimientos
 * @desc    Obtener todos los movimientos (con paginación)
 * @access  Private
 */
router.get('/',
  verifyToken,
  query('limite')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('El límite debe ser entre 1 y 500'),
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número positivo'),
  handleValidation,
  asyncHandler(movimientosController.getAll)
);

/**
 * @route   GET /api/movimientos/area/:area
 * @desc    Obtener movimientos por área
 * @access  Private
 */
router.get('/area/:area',
  verifyToken,
  requireAreaAccess('area'),
  asyncHandler(movimientosController.getByArea)
);

/**
 * @route   GET /api/movimientos/usuario/:email
 * @desc    Obtener movimientos por usuario
 * @access  Private (Admin o propio usuario)
 */
router.get('/usuario/:email',
  verifyToken,
  asyncHandler(movimientosController.getByUsuario)
);

/**
 * @route   GET /api/movimientos/fecha
 * @desc    Obtener movimientos por rango de fechas
 * @access  Private
 */
router.get('/fecha',
  verifyToken,
  query('desde')
    .notEmpty()
    .withMessage('Fecha desde es requerida')
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  query('hasta')
    .notEmpty()
    .withMessage('Fecha hasta es requerida')
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  handleValidation,
  asyncHandler(movimientosController.getByFecha)
);

/**
 * @route   POST /api/movimientos
 * @desc    Crear un nuevo movimiento
 * @access  Private
 */
router.post('/',
  verifyToken,
  body('tipo')
    .isIn(['entrada', 'salida', 'descuento', 'eliminado'])
    .withMessage('Tipo de movimiento inválido'),
  body('productoId')
    .notEmpty()
    .withMessage('ID de producto requerido'),
  body('area')
    .notEmpty()
    .withMessage('Área requerida'),
  body('cantidad')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número positivo'),
  handleValidation,
  asyncHandler(movimientosController.create)
);

/**
 * @route   GET /api/movimientos/estadisticas
 * @desc    Obtener estadísticas de movimientos
 * @access  Private (Admin)
 */
router.get('/estadisticas',
  verifyToken,
  requireAdmin,
  asyncHandler(movimientosController.getEstadisticas)
);

module.exports = router;
