const { getFirestore } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const admin = require('firebase-admin');

/**
 * Obtener todas las áreas
 */
exports.getAll = async (req, res) => {
  const db = getFirestore();
  const user = req.user;

  const snapshot = await db.collection('areas').get();
  
  let areas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Filtrar por áreas permitidas si no es admin
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    areas = areas.filter(area => 
      user.areasPermitidas.includes(area.id) || 
      user.areasPermitidas.includes(area.name)
    );
  }

  res.status(200).json({
    success: true,
    count: areas.length,
    data: areas
  });
};

/**
 * Obtener un área por ID
 */
exports.getById = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;
  const user = req.user;

  const doc = await db.collection('areas').doc(id).get();

  if (!doc.exists) {
    throw new AppError('Área no encontrada', 404);
  }

  const area = { id: doc.id, ...doc.data() };

  // Verificar acceso
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    if (!user.areasPermitidas.includes(area.id) && !user.areasPermitidas.includes(area.name)) {
      throw new AppError('No tienes acceso a esta área', 403);
    }
  }

  res.status(200).json({
    success: true,
    data: area
  });
};

/**
 * Crear una nueva área
 */
exports.create = async (req, res) => {
  const db = getFirestore();
  const { name, campos = [] } = req.body;

  // Verificar que no exista un área con el mismo nombre
  const existingSnapshot = await db.collection('areas')
    .where('name', '==', name)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    throw new AppError('Ya existe un área con ese nombre', 400);
  }

  const areaData = {
    name,
    campos,
    items: [],
    lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: req.user.email
  };

  const docRef = await db.collection('areas').add(areaData);

  logger.info(`Área creada: ${docRef.id} - ${name} por ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Área creada correctamente',
    data: { id: docRef.id, ...areaData }
  });
};

/**
 * Actualizar un área
 */
exports.update = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;
  const { name, campos } = req.body;

  const docRef = db.collection('areas').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppError('Área no encontrada', 404);
  }

  // Si se cambia el nombre, verificar que no exista otro con ese nombre
  if (name) {
    const existingSnapshot = await db.collection('areas')
      .where('name', '==', name)
      .limit(1)
      .get();

    if (!existingSnapshot.empty && existingSnapshot.docs[0].id !== id) {
      throw new AppError('Ya existe un área con ese nombre', 400);
    }
  }

  const updateData = {
    lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: req.user.email
  };

  if (name) updateData.name = name;
  if (campos !== undefined) updateData.campos = campos;

  await docRef.update(updateData);

  logger.info(`Área actualizada: ${id} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Área actualizada correctamente',
    data: { id, ...updateData }
  });
};

/**
 * Eliminar un área
 */
exports.delete = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;

  const docRef = db.collection('areas').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppError('Área no encontrada', 404);
  }

  const areaData = doc.data();

  // Verificar si hay productos en esta área
  const productosSnapshot = await db.collection('productos')
    .where('area', '==', areaData.name)
    .limit(1)
    .get();

  if (!productosSnapshot.empty) {
    throw new AppError('No se puede eliminar el área porque tiene productos asociados', 400);
  }

  await docRef.delete();

  logger.info(`Área eliminada: ${id} - ${areaData.name} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Área eliminada correctamente'
  });
};
