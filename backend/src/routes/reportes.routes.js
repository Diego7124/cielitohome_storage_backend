const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const reportesController = require('../controllers/reportes.controller');
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
 * @route   GET /api/reportes/inventario
 * @desc    Generar reporte de inventario completo
 * @access  Private
 */
router.get('/inventario',
  verifyToken,
  asyncHandler(reportesController.getReporteInventario)
);

/**
 * @route   GET /api/reportes/movimientos
 * @desc    Generar reporte de movimientos
 * @access  Private (Admin)
 */
router.get('/movimientos',
  verifyToken,
  requireAdmin,
  query('desde')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  query('hasta')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  handleValidation,
  asyncHandler(reportesController.getReporteMovimientos)
);

/**
 * @route   GET /api/reportes/stock-bajo
 * @desc    Generar reporte de productos con stock bajo
 * @access  Private
 */
router.get('/stock-bajo',
  verifyToken,
  asyncHandler(reportesController.getReporteStockBajo)
);

/**
 * @route   GET /api/reportes/por-area
 * @desc    Generar reporte agrupado por área
 * @access  Private
 */
router.get('/por-area',
  verifyToken,
  asyncHandler(reportesController.getReportePorArea)
);

/**
 * @route   GET /api/reportes/actividad-usuarios
 * @desc    Generar reporte de actividad de usuarios
 * @access  Private (Admin)
 */
router.get('/actividad-usuarios',
  verifyToken,
  requireAdmin,
  asyncHandler(reportesController.getReporteActividadUsuarios)
);

module.exports = router;
