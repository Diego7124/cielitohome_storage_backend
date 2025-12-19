const { getFirestore } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Obtener todos los usuarios
 */
exports.getAll = async (req, res) => {
  const db = getFirestore();

  const snapshot = await db.collection('usuarios').get();
  
  const usuarios = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.status(200).json({
    success: true,
    count: usuarios.length,
    data: usuarios
  });
};

/**
 * Obtener usuario actual
 */
exports.getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
};

/**
 * Obtener un usuario por ID
 */
exports.getById = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;

  const doc = await db.collection('usuarios').doc(id).get();

  if (!doc.exists) {
    throw new AppError('Usuario no encontrado', 404);
  }

  res.status(200).json({
    success: true,
    data: { id: doc.id, ...doc.data() }
  });
};

/**
 * Crear un nuevo usuario
 */
exports.create = async (req, res) => {
  const db = getFirestore();
  const { email, rol, areasPermitidas = [], soloDescontar = false } = req.body;

  // Verificar que no exista un usuario con el mismo email
  const existingSnapshot = await db.collection('usuarios')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    throw new AppError('Ya existe un usuario con ese email', 400);
  }

  const userData = {
    email,
    rol,
    areasPermitidas,
    soloDescontar,
    createdAt: new Date().toISOString(),
    createdBy: req.user.email
  };

  const docRef = await db.collection('usuarios').add(userData);

  logger.info(`Usuario creado: ${docRef.id} - ${email} por ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Usuario creado correctamente',
    data: { id: docRef.id, ...userData }
  });
};

/**
 * Actualizar un usuario
 */
exports.update = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;
  const { rol, areasPermitidas, soloDescontar } = req.body;

  const docRef = db.collection('usuarios').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const updateData = {
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.email
  };

  if (rol !== undefined) updateData.rol = rol;
  if (areasPermitidas !== undefined) updateData.areasPermitidas = areasPermitidas;
  if (soloDescontar !== undefined) updateData.soloDescontar = soloDescontar;

  await docRef.update(updateData);

  logger.info(`Usuario actualizado: ${id} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Usuario actualizado correctamente',
    data: { id, ...updateData }
  });
};

/**
 * Eliminar un usuario
 */
exports.delete = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;

  const docRef = db.collection('usuarios').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const userData = doc.data();

  // No permitir eliminar al propio usuario
  if (userData.email === req.user.email) {
    throw new AppError('No puedes eliminarte a ti mismo', 400);
  }

  await docRef.delete();

  logger.info(`Usuario eliminado: ${id} - ${userData.email} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Usuario eliminado correctamente'
  });
};
