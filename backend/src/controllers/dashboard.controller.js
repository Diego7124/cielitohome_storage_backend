const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

/**
 * Obtener KPIs del dashboard
 */
exports.getKPIs = async (req, res) => {
  const db = getFirestore();
  const user = req.user;

  // Obtener productos
  const productosSnapshot = await db.collection('productos').get();
  let productos = productosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Obtener áreas
  const areasSnapshot = await db.collection('areas').get();
  let areas = areasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Obtener usuarios
  const usuariosSnapshot = await db.collection('usuarios').get();
  const totalUsuarios = usuariosSnapshot.size;

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

  // Calcular KPIs
  const stockTotal = productos.reduce((sum, p) => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? 0;
    return sum + Number(stock);
  }, 0);

  const productosStockBajo = productos.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? null;
    return stock !== null && Number(stock) > 0 && Number(stock) <= 5;
  }).length;

  const productosSinStock = productos.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? null;
    return stock !== null && Number(stock) === 0;
  }).length;

  res.status(200).json({
    success: true,
    data: {
      totalProductos: productos.length,
      totalAreas: areas.length,
      totalUsuarios: user.rol === 'admin' ? totalUsuarios : null,
      stockTotal,
      productosStockBajo,
      productosSinStock
    }
  });
};

/**
 * Obtener resumen completo para dashboard
 */
exports.getResumen = async (req, res) => {
  const db = getFirestore();
  const user = req.user;

  // Obtener todos los datos necesarios
  const [productosSnapshot, areasSnapshot, movimientosSnapshot] = await Promise.all([
    db.collection('productos').get(),
    db.collection('areas').get(),
    db.collection('movimientos').orderBy('fecha', 'desc').limit(200).get()
  ]);

  let productos = productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  let areas = areasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  let movimientos = movimientosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
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
    movimientos = movimientos.filter(mov => 
      user.areasPermitidas.includes(mov.area)
    );
  }

  // Productos por área
  const productosPorArea = areas.map(area => ({
    name: area.name,
    count: productos.filter(p => p.area === area.name).length
  }));

  // Stock total
  const stockTotal = productos.reduce((sum, p) => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? 0;
    return sum + Number(stock);
  }, 0);

  // Productos recientes
  const productosRecientes = productos.slice(-5).reverse();

  // Productos stock bajo
  const productosStockBajo = productos.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? null;
    return stock !== null && Number(stock) > 0 && Number(stock) <= 5;
  }).slice(0, 5);

  // Movimientos recientes (últimos 7 días)
  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  const movimientosRecientes = movimientos.filter(m => {
    const fecha = new Date(m.fecha);
    return fecha >= hace7Dias;
  });

  res.status(200).json({
    success: true,
    data: {
      kpis: {
        totalProductos: productos.length,
        totalAreas: areas.length,
        stockTotal,
        productosStockBajo: productosStockBajo.length,
        movimientosRecientes: movimientosRecientes.length
      },
      productosPorArea,
      productosRecientes,
      productosStockBajo,
      movimientosRecientes: movimientos.slice(0, 10)
    }
  });
};

/**
 * Obtener alertas de stock
 */
exports.getAlertas = async (req, res) => {
  const db = getFirestore();
  const user = req.user;

  const productosSnapshot = await db.collection('productos').get();
  let productos = productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Filtrar por permisos
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    productos = productos.filter(producto => 
      user.areasPermitidas.includes(producto.area)
    );
  }

  // Productos sin stock
  const sinStock = productos.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? null;
    return stock !== null && Number(stock) === 0;
  });

  // Productos con stock crítico (1-2)
  const stockCritico = productos.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? null;
    return stock !== null && Number(stock) > 0 && Number(stock) <= 2;
  });

  // Productos con stock bajo (3-5)
  const stockBajo = productos.filter(p => {
    const stock = p.cantidad ?? p.Stock ?? p.stock ?? null;
    return stock !== null && Number(stock) > 2 && Number(stock) <= 5;
  });

  res.status(200).json({
    success: true,
    data: {
      totalAlertas: sinStock.length + stockCritico.length + stockBajo.length,
      sinStock: {
        count: sinStock.length,
        productos: sinStock.slice(0, 10)
      },
      stockCritico: {
        count: stockCritico.length,
        productos: stockCritico.slice(0, 10)
      },
      stockBajo: {
        count: stockBajo.length,
        productos: stockBajo.slice(0, 10)
      }
    }
  });
};

/**
 * Obtener tendencias de movimientos
 */
exports.getTendencias = async (req, res) => {
  const db = getFirestore();
  const user = req.user;
  const dias = parseInt(req.query.dias) || 30;

  // Calcular fecha límite
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  const movimientosSnapshot = await db.collection('movimientos')
    .where('fecha', '>=', admin.firestore.Timestamp.fromDate(fechaLimite))
    .orderBy('fecha', 'asc')
    .get();

  let movimientos = movimientosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
  }));

  // Filtrar por permisos
  if (user.rol !== 'admin' && Array.isArray(user.areasPermitidas)) {
    movimientos = movimientos.filter(mov => 
      user.areasPermitidas.includes(mov.area)
    );
  }

  // Agrupar por día
  const tendenciaPorDia = {};
  movimientos.forEach(mov => {
    const dia = new Date(mov.fecha).toISOString().split('T')[0];
    if (!tendenciaPorDia[dia]) {
      tendenciaPorDia[dia] = {
        fecha: dia,
        total: 0,
        entradas: 0,
        descuentos: 0,
        eliminados: 0
      };
    }
    tendenciaPorDia[dia].total++;
    if (mov.tipo === 'entrada') tendenciaPorDia[dia].entradas++;
    if (mov.tipo === 'descuento') tendenciaPorDia[dia].descuentos++;
    if (mov.tipo === 'eliminado') tendenciaPorDia[dia].eliminados++;
  });

  // Agrupar por área
  const tendenciaPorArea = {};
  movimientos.forEach(mov => {
    if (!tendenciaPorArea[mov.area]) {
      tendenciaPorArea[mov.area] = {
        area: mov.area,
        total: 0,
        entradas: 0,
        descuentos: 0
      };
    }
    tendenciaPorArea[mov.area].total++;
    if (mov.tipo === 'entrada') tendenciaPorArea[mov.area].entradas++;
    if (mov.tipo === 'descuento') tendenciaPorArea[mov.area].descuentos++;
  });

  res.status(200).json({
    success: true,
    data: {
      periodo: `${dias} días`,
      totalMovimientos: movimientos.length,
      tendenciaPorDia: Object.values(tendenciaPorDia),
      tendenciaPorArea: Object.values(tendenciaPorArea)
    }
  });
};
