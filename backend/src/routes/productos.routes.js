const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const productosController = require('../controllers/productos.controller');
const { verifyToken, requireAreaAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Validaciones comunes
const validateProducto = [
  body('area')
    .notEmpty()
    .withMessage('El área es requerida')
    .trim(),
  body('nombre')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre no puede exceder 200 caracteres')
];

const validateId = [
  param('id')
    .notEmpty()
    .withMessage('ID de producto requerido')
];

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
 * @route   GET /api/productos
 * @desc    Obtener todos los productos (filtrados por área si el usuario no es admin)
 * @access  Private
 */
router.get('/', 
  verifyToken,
  asyncHandler(productosController.getAll)
);

/**
 * @route   GET /api/productos/area/:area
 * @desc    Obtener productos por área
 * @access  Private
 */
router.get('/area/:area',
  verifyToken,
  requireAreaAccess('area'),
  asyncHandler(productosController.getByArea)
);

/**
 * @route   GET /api/productos/:id
 * @desc    Obtener un producto por ID
 * @access  Private
 */
router.get('/:id',
  verifyToken,
  validateId,
  handleValidation,
  asyncHandler(productosController.getById)
);

/**
 * @route   POST /api/productos
 * @desc    Crear un nuevo producto
 * @access  Private
 */
router.post('/',
  verifyToken,
  requireAreaAccess(),
  validateProducto,
  handleValidation,
  asyncHandler(productosController.create)
);

/**
 * @route   PUT /api/productos/:id
 * @desc    Actualizar un producto
 * @access  Private
 */
router.put('/:id',
  verifyToken,
  validateId,
  handleValidation,
  asyncHandler(productosController.update)
);

/**
 * @route   DELETE /api/productos/:id
 * @desc    Eliminar un producto
 * @access  Private
 */
router.delete('/:id',
  verifyToken,
  validateId,
  handleValidation,
  asyncHandler(productosController.delete)
);

/**
 * @route   POST /api/productos/:id/descontar
 * @desc    Descontar stock de un producto
 * @access  Private
 */
router.post('/:id/descontar',
  verifyToken,
  validateId,
  body('cantidad')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  handleValidation,
  asyncHandler(productosController.descontarStock)
);

/**
 * @route   GET /api/productos/stock/bajo
 * @desc    Obtener productos con stock bajo
 * @access  Private
 */
router.get('/stock/bajo',
  verifyToken,
  asyncHandler(productosController.getStockBajo)
);

module.exports = router;
