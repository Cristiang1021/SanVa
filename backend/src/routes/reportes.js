const express = require('express');
const { sequelize, Venta, Funcion, Evento, Usuario, Asiento, Seccion } = require('../models');
const { authMiddleware, requireAdmin, requireVendedor } = require('../middleware/auth');
const { Op } = require('sequelize');
const pdfService = require('../services/pdfService');
const excelService = require('../services/excelService');
const { SUPER_USER_ID } = require('../constants');

const router = express.Router();

// Reporte general de ventas
router.get('/ventas', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, evento_id, funcion_id } = req.query;

    const where = {};

    if (fecha_inicio && fecha_fin) {
      where.fecha_venta = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    } else if (fecha_inicio) {
      where.fecha_venta = {
        [Op.gte]: new Date(fecha_inicio)
      };
    } else if (fecha_fin) {
      where.fecha_venta = {
        [Op.lte]: new Date(fecha_fin)
      };
    }

    if (evento_id) {
      // Necesitamos incluir función para filtrar por evento
    }

    const ventas = await Venta.findAll({
      where,
      include: [
        {
          model: Funcion,
          as: 'funcion',
          where: evento_id ? { evento_id } : {},
          include: [{ model: Evento, as: 'evento' }]
        },
        { model: Asiento, as: 'asiento', include: [{ model: Seccion, as: 'seccion' }] },
        {
          model: Usuario,
          as: 'vendedor',
          attributes: ['id', 'username', 'nombre_completo']
        }
      ],
      order: [['fecha_venta', 'DESC']]
    });

    // Filtrar por función si se especificó
    const ventasFiltradas = funcion_id
      ? ventas.filter(v => v.funcion_id === parseInt(funcion_id))
      : ventas;

    const total = ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

    res.json({
      ventas: ventasFiltradas,
      total,
      cantidad: ventasFiltradas.length,
      filtros: { fecha_inicio, fecha_fin, evento_id, funcion_id }
    });
  } catch (error) {
    console.error('Error en reporte de ventas:', error);
    res.status(500).json({ error: 'Error al generar reporte de ventas.' });
  }
});

router.get('/ventas.pdf', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, evento_id, funcion_id } = req.query;
    const where = {};
    if (fecha_inicio && fecha_fin) {
      where.fecha_venta = {
        [Op.between]: [new Date(fecha_inicio), new Date(`${fecha_fin}T23:59:59`)]
      };
    } else if (fecha_inicio) {
      where.fecha_venta = { [Op.gte]: new Date(fecha_inicio) };
    } else if (fecha_fin) {
      where.fecha_venta = { [Op.lte]: new Date(`${fecha_fin}T23:59:59`) };
    }

    const ventas = await Venta.findAll({
      where,
      include: [
        {
          model: Funcion,
          as: 'funcion',
          where: evento_id ? { evento_id } : {},
          include: [{ model: Evento, as: 'evento' }]
        },
        { model: Asiento, as: 'asiento', include: [{ model: Seccion, as: 'seccion' }] },
        {
          model: Usuario,
          as: 'vendedor',
          attributes: ['id', 'username', 'nombre_completo']
        }
      ],
      order: [['fecha_venta', 'DESC']]
    });

    const ventasFiltradas = funcion_id
      ? ventas.filter((v) => v.funcion_id === parseInt(funcion_id, 10))
      : ventas;
    const total = ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

    pdfService.generarPdfVentas(res, {
      ventas: ventasFiltradas.map((v) => v.toJSON()),
      total,
      cantidad: ventasFiltradas.length,
      filtros: { fecha_inicio, fecha_fin, evento_id, funcion_id }
    });
  } catch (error) {
    console.error('Error al generar PDF de ventas:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar PDF de ventas.' });
    }
  }
});

router.get('/vendedores.pdf', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const whereVenta = {};
    if (fecha_inicio && fecha_fin) {
      whereVenta.fecha_venta = {
        [Op.between]: [new Date(fecha_inicio), new Date(`${fecha_fin}T23:59:59`)]
      };
    }

    const vendedores = await Usuario.findAll({
      where: {
        rol: 'vendedor',
        activo: true,
        id: { [Op.ne]: SUPER_USER_ID }
      },
      attributes: ['id', 'username', 'nombre_completo']
    });

    const resultados = await Promise.all(vendedores.map(async (vendedor) => {
      const ventas = await Venta.findAll({
        where: { usuario_id: vendedor.id, ...whereVenta }
      });
      return {
        vendedor: vendedor.toJSON(),
        cantidad_ventas: ventas.length,
        total_vendido: ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0)
      };
    }));

    resultados.sort((a, b) => b.total_vendido - a.total_vendido);
    const totalGeneral = resultados.reduce((sum, r) => sum + r.total_vendido, 0);
    const cantidadTotal = resultados.reduce((sum, r) => sum + r.cantidad_ventas, 0);

    pdfService.generarPdfRanking(res, {
      ranking: resultados,
      totales: { cantidad: cantidadTotal, total: totalGeneral }
    });
  } catch (error) {
    console.error('Error al generar PDF de ranking:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar PDF de ranking.' });
    }
  }
});


// Ranking de vendedores
router.get('/vendedores', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const whereVenta = {};

    if (fecha_inicio && fecha_fin) {
      whereVenta.fecha_venta = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    } else if (fecha_inicio) {
      whereVenta.fecha_venta = {
        [Op.gte]: new Date(fecha_inicio)
      };
    } else if (fecha_fin) {
      whereVenta.fecha_venta = {
        [Op.lte]: new Date(fecha_fin)
      };
    }

    // Obtener todos los usuarios con rol vendedor
    const vendedores = await Usuario.findAll({
      where: {
        rol: 'vendedor',
        activo: true,
        id: { [Op.ne]: SUPER_USER_ID }
      },
      attributes: ['id', 'username', 'nombre_completo']
    });

    // Calcular ventas por vendedor
    const resultados = await Promise.all(vendedores.map(async (vendedor) => {
      const ventas = await Venta.findAll({
        where: {
          usuario_id: vendedor.id,
          ...whereVenta
        }
      });

      const cantidad = ventas.length;
      const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

      return {
        vendedor: vendedor.toJSON(),
        cantidad_ventas: cantidad,
        total_vendido: total
      };
    }));

    // Ordenar por total vendido
    resultados.sort((a, b) => b.total_vendido - a.total_vendido);

    // Calcular totales generales
    const totalGeneral = resultados.reduce((sum, r) => sum + r.total_vendido, 0);
    const cantidadTotal = resultados.reduce((sum, r) => sum + r.cantidad_ventas, 0);

    res.json({
      ranking: resultados,
      totales: {
        cantidad: cantidadTotal,
        total: totalGeneral
      }
    });
  } catch (error) {
    console.error('Error en ranking de vendedores:', error);
    res.status(500).json({ error: 'Error al generar ranking de vendedores.' });
  }
});

// Estadísticas por función
router.get('/funcion/:funcionId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const funcion = await Funcion.findByPk(req.params.funcionId, {
      include: [{ model: Evento, as: 'evento' }]
    });

    if (!funcion) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }

    const ventas = await Venta.findAll({
      where: { funcion_id: funcion.id },
      include: [
        { model: Asiento, as: 'asiento' }
      ]
    });

    // Agrupar por sección
    const porSeccion = {};
    ventas.forEach(venta => {
      const seccion = venta.asiento.seccion_id;
      if (!porSeccion[seccion]) {
        porSeccion[seccion] = { cantidad: 0, total: 0 };
      }
      porSeccion[seccion].cantidad++;
      porSeccion[seccion].total += parseFloat(venta.precio_unitario);
    });

    const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

    res.json({
      funcion,
      ventas: ventas.length,
      total,
      por_seccion: porSeccion
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar estadísticas.' });
  }
});

// Dashboard - resumen general
router.get('/dashboard', authMiddleware, requireAdmin, async (req, res) => {
  try {
    // Total de eventos activos
    const eventosActivos = await Evento.count({ where: { activo: true } });

    // Total de funciones activas
    const funcionesActivas = await Funcion.count({ where: { activo: true } });

    // Ventas de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ventasHoy = await Venta.count({
      where: {
        fecha_venta: {
          [Op.gte]: hoy
        }
      }
    });

    const ventasHoyMonto = await Venta.findAll({
      where: {
        fecha_venta: {
          [Op.gte]: hoy
        }
      }
    });

    const totalHoy = ventasHoyMonto.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

    // Vendedores activos
    const vendedoresActivos = await Usuario.count({
      where: {
        rol: 'vendedor',
        activo: true,
        id: { [Op.ne]: SUPER_USER_ID }
      }
    });

    res.json({
      eventos_activos: eventosActivos,
      funciones_activas: funcionesActivas,
      ventas_hoy: {
        cantidad: ventasHoy,
        total: totalHoy
      },
      vendedores_activos: vendedoresActivos
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard.' });
  }
});

const agruparClientes = (ventas) => {
  const mapa = new Map();
  for (const v of ventas) {
    const nombre = v.cliente_nombre || 'Sin nombre';
    const telefono = v.cliente_tel || '';
    const email = v.cliente_email || '';
    const key = `${nombre.trim().toLowerCase()}|${telefono}|${email.toLowerCase()}`;
    if (!mapa.has(key)) {
      mapa.set(key, {
        nombre,
        telefono,
        email,
        asientos: [],
        metodos: new Set(),
        cantidad: 0,
        total: 0
      });
    }
    const g = mapa.get(key);
    const seccion = v.asiento?.seccion?.nombre || '';
    const asiento = `${v.asiento?.fila || ''}${v.asiento?.numero ?? ''}`;
    g.asientos.push([seccion, asiento].filter(Boolean).join(' '));
    if (v.metodo_pago) g.metodos.add(v.metodo_pago);
    g.cantidad += 1;
    g.total += parseFloat(v.precio_unitario);
  }
  return [...mapa.values()]
    .map((c) => ({ ...c, metodos: [...c.metodos].join(', ') }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
};

const obtenerListaPuerta = async (funcionId) => {
  const funcion = await Funcion.findByPk(funcionId, {
    include: [{ model: Evento, as: 'evento' }]
  });
  if (!funcion) return null;

  const ventas = await Venta.findAll({
    where: { funcion_id: funcion.id },
    include: [
      { model: Asiento, as: 'asiento', include: [{ model: Seccion, as: 'seccion' }] }
    ],
    order: [['cliente_nombre', 'ASC']]
  });

  const clientes = agruparClientes(ventas);
  const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);
  return {
    funcion: funcion.toJSON(),
    clientes,
    cantidad: ventas.length,
    total
  };
};

router.get('/lista-puerta', authMiddleware, requireVendedor, async (req, res) => {
  try {
    const { funcion_id } = req.query;
    if (!funcion_id) {
      return res.status(400).json({ error: 'funcion_id es requerido.' });
    }
    const lista = await obtenerListaPuerta(funcion_id);
    if (!lista) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }
    res.json(lista);
  } catch (error) {
    console.error('Error en lista de puerta:', error);
    res.status(500).json({ error: 'Error al obtener la lista de entrada.' });
  }
});

router.get('/lista-puerta.pdf', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { funcion_id } = req.query;
    if (!funcion_id) {
      return res.status(400).json({ error: 'funcion_id es requerido.' });
    }
    const lista = await obtenerListaPuerta(funcion_id);
    if (!lista) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }
    pdfService.generarPdfListaPuerta(res, lista);
  } catch (error) {
    console.error('Error al generar PDF de lista:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar PDF de lista de entrada.' });
    }
  }
});

router.get('/lista-puerta.xlsx', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { funcion_id } = req.query;
    if (!funcion_id) {
      return res.status(400).json({ error: 'funcion_id es requerido.' });
    }
    const lista = await obtenerListaPuerta(funcion_id);
    if (!lista) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }
    await excelService.generarExcelListaPuerta(res, lista);
  } catch (error) {
    console.error('Error al generar Excel de lista:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar Excel de lista de entrada.' });
    }
  }
});

module.exports = router;
