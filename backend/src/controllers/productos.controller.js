const { getFirestore } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const admin = require('firebase-admin');

/**
 * Obtener todos los productos
 */
exports.getAll = async (req, res) => {
  const db = getFirestore();
  const user = req.user;

  let productosRef = db.collection('productos');
  const snapshot = await productosRef.get();
  
  let productos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Filtrar por áreas permitidas si no es admin
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    productos = productos.filter(producto => 
      user.areasPermitidas.includes(producto.area)
    );
  }

  res.status(200).json({
    success: true,
    count: productos.length,
    data: productos
  });
};

/**
 * Obtener productos por área
 */
exports.getByArea = async (req, res) => {
  const db = getFirestore();
  const { area } = req.params;

  const snapshot = await db.collection('productos')
    .where('area', '==', area)
    .get();

  const productos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.status(200).json({
    success: true,
    count: productos.length,
    data: productos
  });
};

/**
 * Obtener un producto por ID
 */
exports.getById = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;

  const doc = await db.collection('productos').doc(id).get();

  if (!doc.exists) {
    throw new AppError('Producto no encontrado', 404);
  }

  const producto = { id: doc.id, ...doc.data() };

  // Verificar acceso al área
  const user = req.user;
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    if (!user.areasPermitidas.includes(producto.area)) {
      throw new AppError('No tienes acceso a este producto', 403);
    }
  }

  res.status(200).json({
    success: true,
    data: producto
  });
};

/**
 * Crear un nuevo producto
 */
exports.create = async (req, res) => {
  const db = getFirestore();
  const productoData = {
    ...req.body,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: req.user.email
  };

  const docRef = await db.collection('productos').add(productoData);

  // Registrar movimiento de entrada
  await db.collection('movimientos').add({
    tipo: 'entrada',
    productoId: docRef.id,
    productoNombre: productoData.nombre || productoData.Nombre || 'Sin nombre',
    area: productoData.area,
    cantidad: productoData.cantidad || productoData.Stock || 1,
    usuario: req.user.email,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
    descripcion: 'Producto creado'
  });

  logger.info(`Producto creado: ${docRef.id} por ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Producto creado correctamente',
    data: { id: docRef.id, ...productoData }
  });
};

/**
 * Actualizar un producto
 */
exports.update = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;
  const updateData = {
    ...req.body,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: req.user.email
  };

  // Verificar que existe
  const docRef = db.collection('productos').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppError('Producto no encontrado', 404);
  }

  // Verificar acceso
  const productoActual = doc.data();
  const user = req.user;
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    if (!user.areasPermitidas.includes(productoActual.area)) {
      throw new AppError('No tienes acceso a este producto', 403);
    }
  }

  await docRef.update(updateData);

  logger.info(`Producto actualizado: ${id} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Producto actualizado correctamente',
    data: { id, ...updateData }
  });
};

/**
 * Eliminar un producto
 */
exports.delete = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;

  const docRef = db.collection('productos').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppError('Producto no encontrado', 404);
  }

  const producto = doc.data();

  // Verificar acceso
  const user = req.user;
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    if (!user.areasPermitidas.includes(producto.area)) {
      throw new AppError('No tienes acceso a este producto', 403);
    }
  }

  // Registrar movimiento de eliminación
  await db.collection('movimientos').add({
    tipo: 'eliminado',
    productoId: id,
    productoNombre: producto.nombre || producto.Nombre || 'Sin nombre',
    area: producto.area,
    usuario: req.user.email,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
    descripcion: 'Producto eliminado'
  });

  await docRef.delete();

  logger.info(`Producto eliminado: ${id} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Producto eliminado correctamente'
  });
};

/**
 * Descontar stock de un producto
 */
exports.descontarStock = async (req, res) => {
  const db = getFirestore();
  const { id } = req.params;
  const { cantidad } = req.body;

  const docRef = db.collection('productos').doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppError('Producto no encontrado', 404);
  }

  const producto = doc.data();
  
  // Verificar acceso
  const user = req.user;
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    if (!user.areasPermitidas.includes(producto.area)) {
      throw new AppError('No tienes acceso a este producto', 403);
    }
  }

  // Buscar campo de stock
  const stockActual = producto.cantidad ?? producto.Stock ?? producto.stock ?? 0;
  
  if (stockActual < cantidad) {
    throw new AppError(`Stock insuficiente. Disponible: ${stockActual}`, 400);
  }

  const nuevoStock = stockActual - cantidad;

  // Actualizar el campo correcto de stock
  const campoStock = 'cantidad' in producto ? 'cantidad' : 
                     'Stock' in producto ? 'Stock' : 
                     'stock' in producto ? 'stock' : 'cantidad';

  await docRef.update({
    [campoStock]: nuevoStock,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: req.user.email
  });

  // Registrar movimiento
  await db.collection('movimientos').add({
    tipo: 'descuento',
    productoId: id,
    productoNombre: producto.nombre || producto.Nombre || 'Sin nombre',
    area: producto.area,
    cantidad: cantidad,
    stockAnterior: stockActual,
    stockNuevo: nuevoStock,
    usuario: req.user.email,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
    descripcion: `Descuento de ${cantidad} unidades`
  });

  logger.info(`Stock descontado: ${id}, cantidad: ${cantidad} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Stock descontado correctamente',
    data: {
      productoId: id,
      stockAnterior: stockActual,
      cantidadDescontada: cantidad,
      stockActual: nuevoStock
    }
  });
};

/**
 * Obtener productos con stock bajo
 */
exports.getStockBajo = async (req, res) => {
  const db = getFirestore();
  const user = req.user;
  const umbral = parseInt(req.query.umbral) || 5;

  const snapshot = await db.collection('productos').get();
  
  let productos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Filtrar por áreas permitidas
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    productos = productos.filter(producto => 
      user.areasPermitidas.includes(producto.area)
    );
  }

  // Filtrar por stock bajo
  const productosStockBajo = productos.filter(producto => {
    const stock = producto.cantidad ?? producto.Stock ?? producto.stock ?? null;
    return stock !== null && Number(stock) <= umbral && Number(stock) >= 0;
  });

  res.status(200).json({
    success: true,
    count: productosStockBajo.length,
    umbral,
    data: productosStockBajo
  });
};
