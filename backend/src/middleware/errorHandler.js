const logger = require('../utils/logger');

/**
 * Manejador de errores global
 */
const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.email || 'anonymous'
  });

  // Errores de validación de express-validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.array()
    });
  }

  // Errores de Firebase
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(401).json({
      success: false,
      message: getFirebaseAuthErrorMessage(err.code),
      code: err.code
    });
  }

  // Errores de Firestore
  if (err.code && (err.code.startsWith('firestore/') || err.code === 'permission-denied')) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para realizar esta acción',
      code: err.code
    });
  }

  // Error de CORS
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido'
    });
  }

  // Errores personalizados con status
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message
    });
  }

  // Error genérico del servidor
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

/**
 * Manejador de rutas no encontradas
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Traduce códigos de error de Firebase Auth
 */
const getFirebaseAuthErrorMessage = (code) => {
  const messages = {
    'auth/id-token-expired': 'La sesión ha expirado, por favor inicia sesión nuevamente',
    'auth/id-token-revoked': 'La sesión ha sido revocada',
    'auth/invalid-id-token': 'Token de autenticación inválido',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/invalid-email': 'Email inválido',
    'auth/email-already-exists': 'El email ya está registrado'
  };
  return messages[code] || 'Error de autenticación';
};

/**
 * Wrapper para manejar errores async
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Crear error personalizado
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError
};
