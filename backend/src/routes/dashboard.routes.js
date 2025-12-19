const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/dashboard/kpis
 * @desc    Obtener KPIs del dashboard
 * @access  Private
 */
router.get('/kpis',
  verifyToken,
  asyncHandler(dashboardController.getKPIs)
);

/**
 * @route   GET /api/dashboard/resumen
 * @desc    Obtener resumen completo para dashboard
 * @access  Private
 */
router.get('/resumen',
  verifyToken,
  asyncHandler(dashboardController.getResumen)
);

/**
 * @route   GET /api/dashboard/alertas
 * @desc    Obtener alertas de stock
 * @access  Private
 */
router.get('/alertas',
  verifyToken,
  asyncHandler(dashboardController.getAlertas)
);

/**
 * @route   GET /api/dashboard/tendencias
 * @desc    Obtener tendencias de movimientos
 * @access  Private
 */
router.get('/tendencias',
  verifyToken,
  asyncHandler(dashboardController.getTendencias)
);

module.exports = router;
