const { getFirestore } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const admin = require('firebase-admin');

/**
 * Obtener todos los movimientos con paginación
 */
exports.getAll = async (req, res) => {
  const db = getFirestore();
  const user = req.user;
  const limite = parseInt(req.query.limite) || 100;
  const pagina = parseInt(req.query.pagina) || 1;
  const offset = (pagina - 1) * limite;

  let query = db.collection('movimientos')
    .orderBy('fecha', 'desc');

  // Filtrar por áreas permitidas si no es admin
  // Nota: Firestore no permite filtrar por array directamente,
  // así que traemos todo y filtramos en memoria para usuarios no admin
  const snapshot = await query.get();

  let movimientos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  // Filtrar por áreas permitidas
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    movimientos = movimientos.filter(mov => 
      user.areasPermitidas.includes(mov.area)
    );
  }

  // Paginación manual
  const total = movimientos.length;
  movimientos = movimientos.slice(offset, offset + limite);

  res.status(200).json({
    success: true,
    count: movimientos.length,
    total,
    pagina,
    totalPaginas: Math.ceil(total / limite),
    data: movimientos
  });
};

/**
 * Obtener movimientos por área
 */
exports.getByArea = async (req, res) => {
  const db = getFirestore();
  const { area } = req.params;
  const limite = parseInt(req.query.limite) || 100;

  const snapshot = await db.collection('movimientos')
    .where('area', '==', area)
    .orderBy('fecha', 'desc')
    .limit(limite)
    .get();

  const movimientos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  res.status(200).json({
    success: true,
    count: movimientos.length,
    data: movimientos
  });
};

/**
 * Obtener movimientos por usuario
 */
exports.getByUsuario = async (req, res) => {
  const db = getFirestore();
  const { email } = req.params;
  const user = req.user;
  const limite = parseInt(req.query.limite) || 100;

  // Solo admin o el propio usuario pueden ver sus movimientos
  if (user.rol !== 'admin' && user.email !== email) {
    throw new AppError('No tienes permiso para ver estos movimientos', 403);
  }

  const snapshot = await db.collection('movimientos')
    .where('usuario', '==', email)
    .orderBy('fecha', 'desc')
    .limit(limite)
    .get();

  const movimientos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  res.status(200).json({
    success: true,
    count: movimientos.length,
    data: movimientos
  });
};

/**
 * Obtener movimientos por rango de fechas
 */
exports.getByFecha = async (req, res) => {
  const db = getFirestore();
  const user = req.user;
  const { desde, hasta } = req.query;

  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  fechaHasta.setHours(23, 59, 59, 999);

  const snapshot = await db.collection('movimientos')
    .where('fecha', '>=', admin.firestore.Timestamp.fromDate(fechaDesde))
    .where('fecha', '<=', admin.firestore.Timestamp.fromDate(fechaHasta))
    .orderBy('fecha', 'desc')
    .get();

  let movimientos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  // Filtrar por áreas permitidas
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    movimientos = movimientos.filter(mov => 
      user.areasPermitidas.includes(mov.area)
    );
  }

  res.status(200).json({
    success: true,
    count: movimientos.length,
    data: movimientos
  });
};

/**
 * Crear un nuevo movimiento
 */
exports.create = async (req, res) => {
  const db = getFirestore();
  const { tipo, productoId, area, cantidad, descripcion, productoNombre } = req.body;

  const movimientoData = {
    tipo,
    productoId,
    productoNombre: productoNombre || 'Sin nombre',
    area,
    cantidad: cantidad || 1,
    descripcion: descripcion || '',
    usuario: req.user.email,
    fecha: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('movimientos').add(movimientoData);

  logger.info(`Movimiento creado: ${docRef.id} - ${tipo} por ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Movimiento registrado correctamente',
    data: { id: docRef.id, ...movimientoData }
  });
};

/**
 * Obtener estadísticas de movimientos
 */
exports.getEstadisticas = async (req, res) => {
  const db = getFirestore();

  // Obtener movimientos de los últimos 30 días
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  const snapshot = await db.collection('movimientos')
    .where('fecha', '>=', admin.firestore.Timestamp.fromDate(hace30Dias))
    .get();

  const movimientos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  // Calcular estadísticas
  const estadisticas = {
    total: movimientos.length,
    porTipo: {},
    porArea: {},
    porUsuario: {},
    porDia: {}
  };

  movimientos.forEach(mov => {
    // Por tipo
    estadisticas.porTipo[mov.tipo] = (estadisticas.porTipo[mov.tipo] || 0) + 1;
    
    // Por área
    estadisticas.porArea[mov.area] = (estadisticas.porArea[mov.area] || 0) + 1;
    
    // Por usuario
    estadisticas.porUsuario[mov.usuario] = (estadisticas.porUsuario[mov.usuario] || 0) + 1;
    
    // Por día
    if (mov.fecha) {
      const dia = new Date(mov.fecha).toISOString().split('T')[0];
      estadisticas.porDia[dia] = (estadisticas.porDia[dia] || 0) + 1;
    }
  });

  res.status(200).json({
    success: true,
    periodo: '30 días',
    data: estadisticas
  });
};
