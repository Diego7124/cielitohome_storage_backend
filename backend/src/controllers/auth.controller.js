const { getFirestore } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Verificar token y devolver datos del usuario
 */
exports.verifyToken = async (req, res) => {
  // Si llegamos aquí, el token ya fue verificado por el middleware
  res.status(200).json({
    success: true,
    message: 'Token válido',
    data: {
      uid: req.user.uid,
      email: req.user.email,
      rol: req.user.rol,
      areasPermitidas: req.user.areasPermitidas
    }
  });
};

/**
 * Obtener información del usuario autenticado
 */
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
};

/**
 * Registrar usuario en Firestore (si no existe)
 */
exports.register = async (req, res) => {
  const db = getFirestore();
  const { email, uid } = req.user;

  // Verificar si ya existe
  const existingSnapshot = await db.collection('usuarios')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    // Usuario ya existe, devolver datos existentes
    const existingUser = existingSnapshot.docs[0];
    return res.status(200).json({
      success: true,
      message: 'Usuario ya registrado',
      data: { id: existingUser.id, ...existingUser.data() }
    });
  }

  // Crear nuevo usuario con rol por defecto
  const userData = {
    email,
    uid,
    rol: 'usuario',
    areasPermitidas: [],
    soloDescontar: false,
    createdAt: new Date().toISOString()
  };

  const docRef = await db.collection('usuarios').add(userData);

  logger.info(`Usuario registrado: ${docRef.id} - ${email}`);

  res.status(201).json({
    success: true,
    message: 'Usuario registrado correctamente',
    data: { id: docRef.id, ...userData }
  });
};
