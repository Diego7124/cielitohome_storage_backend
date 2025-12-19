const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

/**
 * Generar reporte de inventario completo
 */
exports.getReporteInventario = async (req, res) => {
  const db = getFirestore();
  const user = req.user;

  // Obtener productos
  const productosSnapshot = await db.collection('productos').get();
  let productos = productosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Filtrar por áreas permitidas
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    productos = productos.filter(producto => 
      user.areasPermitidas.includes(producto.area)
    );
  }

  // Obtener áreas para agrupar
  const areasSnapshot = await db.collection('areas').get();
  let areas = areasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    areas = areas.filter(area => 
      user.areasPermitidas.includes(area.id) || 
      user.areasPermitidas.includes(area.name)
    );
  }

  // Agrupar productos por área
  const inventarioPorArea = areas.map(area => {
    const productosArea = productos.filter(p => p.area === area.name);
    const stockTotal = productosArea.reduce((sum, p) => {
      const stock = p.cantidad ?? p.Stock ?? p.stock ?? 0;
      return sum + Number(stock);
    }, 0);

    return {
      area: area.name,
      totalProductos: productosArea.length,
      stockTotal,
      productos: productosArea
    };
  });

  const resumen = {
    totalAreas: areas.length,
    totalProductos: productos.length,
    stockTotal: inventarioPorArea.reduce((sum, a) => sum + a.stockTotal, 0),
    fechaGeneracion: new Date().toISOString()
  };

  res.status(200).json({
    success: true,
    data: {
      resumen,
      inventarioPorArea
    }
  });
};

/**
 * Generar reporte de movimientos
 */
exports.getReporteMovimientos = async (req, res) => {
  const db = getFirestore();
  const { desde, hasta } = req.query;

  let query = db.collection('movimientos').orderBy('fecha', 'desc');

  // Filtrar por fechas si se proporcionan
  if (desde) {
    const fechaDesde = new Date(desde);
    query = query.where('fecha', '>=', admin.firestore.Timestamp.fromDate(fechaDesde));
  }

  if (hasta) {
    const fechaHasta = new Date(hasta);
    fechaHasta.setHours(23, 59, 59, 999);
    query = query.where('fecha', '<=', admin.firestore.Timestamp.fromDate(fechaHasta));
  }

  const snapshot = await query.get();

  const movimientos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  // Estadísticas
  const estadisticas = {
    total: movimientos.length,
    entradas: movimientos.filter(m => m.tipo === 'entrada').length,
    descuentos: movimientos.filter(m => m.tipo === 'descuento').length,
    eliminados: movimientos.filter(m => m.tipo === 'eliminado').length
  };

  res.status(200).json({
    success: true,
    data: {
      estadisticas,
      movimientos,
      fechaGeneracion: new Date().toISOString()
    }
  });
};

/**
 * Generar reporte de productos con stock bajo
 */
exports.getReporteStockBajo = async (req, res) => {
  const db = getFirestore();
  const user = req.user;
  const umbral = parseInt(req.query.umbral) || 5;

  const productosSnapshot = await db.collection('productos').get();
  let productos = productosSnapshot.docs.map(doc => ({
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
    return stock !== null && Number(stock) <= umbral;
  }).sort((a, b) => {
    const stockA = a.cantidad ?? a.Stock ?? a.stock ?? 0;
    const stockB = b.cantidad ?? b.Stock ?? b.stock ?? 0;
    return stockA - stockB;
  });

  // Productos sin stock
  const productosSinStock = productosStockBajo.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? 0;
    return Number(stock) === 0;
  });

  // Productos con stock crítico (1-2)
  const productosStockCritico = productosStockBajo.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? 0;
    return Number(stock) > 0 && Number(stock) <= 2;
  });

  res.status(200).json({
    success: true,
    data: {
      resumen: {
        totalStockBajo: productosStockBajo.length,
        sinStock: productosSinStock.length,
        stockCritico: productosStockCritico.length,
        umbral
      },
      productosSinStock,
      productosStockCritico,
      todosStockBajo: productosStockBajo,
      fechaGeneracion: new Date().toISOString()
    }
  });
};

/**
 * Generar reporte agrupado por área
 */
exports.getReportePorArea = async (req, res) => {
  const db = getFirestore();
  const user = req.user;

  // Obtener áreas
  const areasSnapshot = await db.collection('areas').get();
  let areas = areasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Obtener productos
  const productosSnapshot = await db.collection('productos').get();
  let productos = productosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Filtrar por permisos
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    areas = areas.filter(area => 
      user.areasPermitidas.includes(area.id) || 
      user.areasPermitidas.includes(area.name)
    );
    productos = productos.filter(producto => 
      user.areasPermitidas.includes(producto.area)
    );
  }

  // Generar reporte por área
  const reportePorArea = areas.map(area => {
    const productosArea = productos.filter(p => p.area === area.name);
    const stockTotal = productosArea.reduce((sum, p) => {
      const stock = p.cantidad ?? p.Stock ?? p.stock ?? 0;
      return sum + Number(stock);
    }, 0);

    const stockBajo = productosArea.filter(p => {
      const stock = p.cantidad ?? p.Stock ?? p.stock ?? null;
      return stock !== null && Number(stock) <= 5;
    }).length;

    return {
      id: area.id,
      nombre: area.name,
      campos: area.campos || [],
      totalProductos: productosArea.length,
      stockTotal,
      productosStockBajo: stockBajo,
      ultimaActualizacion: area.lastUpdate
    };
  });

  res.status(200).json({
    success: true,
    data: {
      totalAreas: areas.length,
      totalProductos: productos.length,
      areas: reportePorArea,
      fechaGeneracion: new Date().toISOString()
    }
  });
};

/**
 * Generar reporte de actividad de usuarios
 */
exports.getReporteActividadUsuarios = async (req, res) => {
  const db = getFirestore();
  const dias = parseInt(req.query.dias) || 30;

  // Calcular fecha límite
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  // Obtener movimientos
  const movimientosSnapshot = await db.collection('movimientos')
    .where('fecha', '>=', admin.firestore.Timestamp.fromDate(fechaLimite))
    .get();

  const movimientos = movimientosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  // Agrupar por usuario
  const actividadPorUsuario = {};
  movimientos.forEach(mov => {
    if (!actividadPorUsuario[mov.usuario]) {
      actividadPorUsuario[mov.usuario] = {
        email: mov.usuario,
        totalMovimientos: 0,
        entradas: 0,
        descuentos: 0,
        eliminados: 0,
        ultimaActividad: null
      };
    }

    actividadPorUsuario[mov.usuario].totalMovimientos++;
    
    if (mov.tipo === 'entrada') actividadPorUsuario[mov.usuario].entradas++;
    if (mov.tipo === 'descuento') actividadPorUsuario[mov.usuario].descuentos++;
    if (mov.tipo === 'eliminado') actividadPorUsuario[mov.usuario].eliminados++;

    const fechaMov = new Date(mov.fecha);
    if (!actividadPorUsuario[mov.usuario].ultimaActividad || 
        fechaMov > new Date(actividadPorUsuario[mov.usuario].ultimaActividad)) {
      actividadPorUsuario[mov.usuario].ultimaActividad = mov.fecha;
    }
  });

  // Convertir a array y ordenar por actividad
  const usuariosOrdenados = Object.values(actividadPorUsuario)
    .sort((a, b) => b.totalMovimientos - a.totalMovimientos);

  res.status(200).json({
    success: true,
    data: {
      periodo: `${dias} días`,
      totalMovimientos: movimientos.length,
      usuariosActivos: usuariosOrdenados.length,
      actividad: usuariosOrdenados,
      fechaGeneracion: new Date().toISOString()
    }
  });
};
