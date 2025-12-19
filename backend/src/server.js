require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Importar configuración de Firebase
const { initializeFirebase } = require('./config/firebase');

// Importar rutas
const productosRoutes = require('./routes/productos.routes');
const areasRoutes = require('./routes/areas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const movimientosRoutes = require('./routes/movimientos.routes');
const authRoutes = require('./routes/auth.routes');
const reportesRoutes = require('./routes/reportes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Importar middleware de errores
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Inicializar Firebase Admin
initializeFirebase();

const app = express();

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Helmet - Headers de seguridad
app.use(helmet());

// CORS - Configuración de orígenes permitidos
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting - Limitar requests por IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes, por favor intente más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ============================================
// MIDDLEWARES DE PARSING Y LOGGING
// ============================================

// Parser de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan - Logging de requests HTTP
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// ============================================
// RUTAS DE LA API
// ============================================

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ============================================
// MANEJO DE ERRORES
// ============================================

// Manejar rutas no encontradas
app.use(notFoundHandler);

// Manejar errores globales
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  logger.info(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 URL: http://localhost:${PORT}`);
});

module.exports = app;
