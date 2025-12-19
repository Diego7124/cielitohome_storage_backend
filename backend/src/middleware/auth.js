const { getAuth, getFirestore } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Middleware para verificar el token de Firebase
 * Extrae el usuario del token y lo añade a req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación no proporcionado'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verificar el token con Firebase Auth
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Obtener datos adicionales del usuario desde Firestore
    const db = getFirestore();
    const usuariosSnapshot = await db.collection('usuarios')
      .where('email', '==', decodedToken.email)
      .limit(1)
      .get();

    let userData = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      rol: 'usuario', // Rol por defecto
      areasPermitidas: []
    };

    if (!usuariosSnapshot.empty) {
      const userDoc = usuariosSnapshot.docs[0];
      userData = {
        ...userData,
        id: userDoc.id,
        ...userDoc.data()
      };
    }

    req.user = userData;
    next();
  } catch (error) {
    logger.error('Error al verificar token:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'La sesión ha expirado, por favor inicia sesión nuevamente'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token de autenticación inválido'
    });
  }
};

/**
 * Middleware para verificar que el usuario sea admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }

  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador'
    });
  }

  next();
};

/**
 * Middleware para verificar que el usuario tenga rol de admin o inventario
 */
const requireInventoryAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }

  const allowedRoles = ['admin', 'inventario'];
  if (!allowedRoles.includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para acceder al inventario'
    });
  }

  next();
};

/**
 * Middleware para verificar acceso a un área específica
 */
const requireAreaAccess = (areaParam = 'area') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    // Los admin tienen acceso a todo
    if (req.user.rol === 'admin') {
      return next();
    }

    const area = req.params[areaParam] || req.body.area || req.query.area;

    if (!area) {
      return next(); // Si no hay área especificada, dejamos pasar
    }

    // Verificar si el usuario tiene acceso al área
    const areasPermitidas = req.user.areasPermitidas || [];
    if (!areasPermitidas.includes(area)) {
      return res.status(403).json({
        success: false,
        message: `No tienes acceso al área: ${area}`
      });
    }

    next();
  };
};

/**
 * Middleware opcional de autenticación (no bloquea si no hay token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    const db = getFirestore();
    const usuariosSnapshot = await db.collection('usuarios')
      .where('email', '==', decodedToken.email)
      .limit(1)
      .get();

    let userData = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      rol: 'usuario',
      areasPermitidas: []
    };

    if (!usuariosSnapshot.empty) {
      const userDoc = usuariosSnapshot.docs[0];
      userData = {
        ...userData,
        id: userDoc.id,
        ...userDoc.data()
      };
    }

    req.user = userData;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireInventoryAccess,
  requireAreaAccess,
  optionalAuth
};
