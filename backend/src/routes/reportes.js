const express = require('express');
const { sequelize, Venta, Funcion, Evento, Usuario, Asiento, Seccion } = require('../models');
const { useTurso } = require('../config/database');
const { authMiddleware, requireAdmin, requireVendedor } = require('../middleware/auth');
const { Op } = require('sequelize');
const { SUPER_USER_ID } = require('../constants');

const router = express.Router();

// PDF/Excel solo al descargar — no en cada cold start de /reportes/*
const getPdfService = () => require('../services/pdfService');
const getExcelService = () => require('../services/excelService');

const finDeDia = (fecha) => {
  if (!fecha) return null;
  const s = String(fecha);
  return s.includes('T') ? new Date(s) : new Date(`${s}T23:59:59`);
};

const buildFechaWhere = (fecha_inicio, fecha_fin) => {
  if (fecha_inicio && fecha_fin) {
    return { [Op.between]: [new Date(fecha_inicio), finDeDia(fecha_fin)] };
  }
  if (fecha_inicio) return { [Op.gte]: new Date(fecha_inicio) };
  if (fecha_fin) return { [Op.lte]: finDeDia(fecha_fin) };
  return null;
};

const mapVentaRowTurso = (row) => ({
  id: row.id,
  funcion_id: row.funcion_id,
  asiento_id: row.asiento_id,
  usuario_id: row.usuario_id,
  cliente_nombre: row.cliente_nombre,
  cliente_tel: row.cliente_tel,
  cliente_email: row.cliente_email,
  metodo_pago: row.metodo_pago,
  referencia_pago: row.referencia_pago,
  precio_unitario: row.precio_unitario,
  fecha_venta: row.fecha_venta,
  funcion: {
    id: row.funcion_id,
    evento_id: row.evento_id,
    fecha_hora: row.funcion_fecha_hora,
    lugar: row.funcion_lugar,
    evento: {
      id: row.evento_id,
      nombre: row.evento_nombre,
    },
  },
  asiento: {
    id: row.asiento_id,
    fila: row.asiento_fila,
    numero: row.asiento_numero,
    seccion_id: row.seccion_id,
    seccion: {
      id: row.seccion_id,
      nombre: row.seccion_nombre,
    },
  },
  vendedor: {
    id: row.vendedor_id,
    username: row.vendedor_username,
    nombre_completo: row.vendedor_nombre,
  },
});

async function obtenerVentasReporte({ fecha_inicio, fecha_fin, evento_id, funcion_id }) {
  if (useTurso) {
    const { tursoAll } = require('../config/tursoQuery');
    const clauses = [];
    const args = [];

    if (fecha_inicio && fecha_fin) {
      clauses.push('v.fecha_venta BETWEEN ? AND ?');
      args.push(new Date(fecha_inicio).toISOString(), finDeDia(fecha_fin).toISOString());
    } else if (fecha_inicio) {
      clauses.push('v.fecha_venta >= ?');
      args.push(new Date(fecha_inicio).toISOString());
    } else if (fecha_fin) {
      clauses.push('v.fecha_venta <= ?');
      args.push(finDeDia(fecha_fin).toISOString());
    }

    if (evento_id) {
      clauses.push('f.evento_id = ?');
      args.push(Number(evento_id));
    }
    if (funcion_id) {
      clauses.push('v.funcion_id = ?');
      args.push(Number(funcion_id));
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await tursoAll(
      `SELECT
         v.id, v.funcion_id, v.asiento_id, v.usuario_id,
         v.cliente_nombre, v.cliente_tel, v.cliente_email,
         v.metodo_pago, v.referencia_pago, v.precio_unitario, v.fecha_venta,
         f.evento_id, f.fecha_hora AS funcion_fecha_hora, f.lugar AS funcion_lugar,
         e.nombre AS evento_nombre,
         a.fila AS asiento_fila, a.numero AS asiento_numero, a.seccion_id,
         s.nombre AS seccion_nombre,
         u.id AS vendedor_id, u.username AS vendedor_username,
         u.nombre_completo AS vendedor_nombre
       FROM ventas v
       JOIN funciones f ON f.id = v.funcion_id
       JOIN eventos e ON e.id = f.evento_id
       JOIN asientos a ON a.id = v.asiento_id
       JOIN secciones s ON s.id = a.seccion_id
       JOIN usuarios u ON u.id = v.usuario_id
       ${whereSql}
       ORDER BY v.fecha_venta DESC`,
      args
    );

    const ventas = rows.map(mapVentaRowTurso);
    const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario || 0), 0);
    return { ventas, total, cantidad: ventas.length };
  }

  const where = {};
  const fechaWhere = buildFechaWhere(fecha_inicio, fecha_fin);
  if (fechaWhere) where.fecha_venta = fechaWhere;
  if (funcion_id) where.funcion_id = Number(funcion_id);

  const funcionWhere = {};
  if (evento_id) funcionWhere.evento_id = Number(evento_id);

  const ventas = await Venta.findAll({
    where,
    attributes: [
      'id',
      'funcion_id',
      'asiento_id',
      'usuario_id',
      'cliente_nombre',
      'cliente_tel',
      'cliente_email',
      'metodo_pago',
      'referencia_pago',
      'precio_unitario',
      'fecha_venta',
    ],
    include: [
      {
        model: Funcion,
        as: 'funcion',
        attributes: ['id', 'evento_id', 'fecha_hora', 'lugar'],
        where: Object.keys(funcionWhere).length ? funcionWhere : undefined,
        include: [
          {
            model: Evento,
            as: 'evento',
            attributes: ['id', 'nombre'],
          },
        ],
      },
      {
        model: Asiento,
        as: 'asiento',
        attributes: ['id', 'fila', 'numero', 'seccion_id'],
        include: [
          {
            model: Seccion,
            as: 'seccion',
            attributes: ['id', 'nombre'],
          },
        ],
      },
      {
        model: Usuario,
        as: 'vendedor',
        attributes: ['id', 'username', 'nombre_completo'],
      },
    ],
    order: [['fecha_venta', 'DESC']],
  });

  const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);
  return {
    ventas: ventas.map((v) => v.toJSON()),
    total,
    cantidad: ventas.length,
  };
}

async function obtenerRanking({ fecha_inicio, fecha_fin, evento_id, funcion_id }) {
  if (useTurso) {
    const { tursoAll } = require('../config/tursoQuery');
    const subClauses = [];
    const args = [];

    if (fecha_inicio && fecha_fin) {
      subClauses.push('v.fecha_venta BETWEEN ? AND ?');
      args.push(new Date(fecha_inicio).toISOString(), finDeDia(fecha_fin).toISOString());
    } else if (fecha_inicio) {
      subClauses.push('v.fecha_venta >= ?');
      args.push(new Date(fecha_inicio).toISOString());
    } else if (fecha_fin) {
      subClauses.push('v.fecha_venta <= ?');
      args.push(finDeDia(fecha_fin).toISOString());
    }

    if (funcion_id) {
      subClauses.push('v.funcion_id = ?');
      args.push(Number(funcion_id));
    }
    if (evento_id) {
      subClauses.push('f.evento_id = ?');
      args.push(Number(evento_id));
    }

    const needsFuncion = Boolean(evento_id);
    const subWhere = subClauses.length ? `WHERE ${subClauses.join(' AND ')}` : '';
    const subFrom = needsFuncion
      ? 'FROM ventas v INNER JOIN funciones f ON f.id = v.funcion_id'
      : 'FROM ventas v';

    args.push(SUPER_USER_ID);

    const rows = await tursoAll(
      `SELECT
         u.id, u.username, u.nombre_completo,
         COUNT(fv.id) AS cantidad_ventas,
         COALESCE(SUM(fv.precio_unitario), 0) AS total_vendido
       FROM usuarios u
       LEFT JOIN (
         SELECT v.id, v.usuario_id, v.precio_unitario
         ${subFrom}
         ${subWhere}
       ) fv ON fv.usuario_id = u.id
       WHERE u.rol = 'vendedor' AND u.activo = 1 AND u.id != ?
       GROUP BY u.id, u.username, u.nombre_completo
       ORDER BY total_vendido DESC, cantidad_ventas DESC`,
      args
    );

    const ranking = rows.map((row) => ({
      vendedor: {
        id: row.id,
        username: row.username,
        nombre_completo: row.nombre_completo,
      },
      cantidad_ventas: Number(row.cantidad_ventas || 0),
      total_vendido: parseFloat(row.total_vendido || 0),
    }));

    return {
      ranking,
      totales: {
        cantidad: ranking.reduce((s, r) => s + r.cantidad_ventas, 0),
        total: ranking.reduce((s, r) => s + r.total_vendido, 0),
      },
    };
  }

  const whereVenta = {};
  const fechaWhere = buildFechaWhere(fecha_inicio, fecha_fin);
  if (fechaWhere) whereVenta.fecha_venta = fechaWhere;
  if (funcion_id) whereVenta.funcion_id = Number(funcion_id);

  const include = [];
  if (evento_id) {
    include.push({
      model: Funcion,
      as: 'funcion',
      attributes: [],
      where: { evento_id: Number(evento_id) },
      required: true,
    });
  }

  const agregados = await Venta.findAll({
    attributes: [
      'usuario_id',
      [sequelize.fn('COUNT', sequelize.col('Venta.id')), 'cantidad_ventas'],
      [sequelize.fn('SUM', sequelize.col('Venta.precio_unitario')), 'total_vendido'],
    ],
    where: whereVenta,
    include,
    group: ['usuario_id'],
    raw: true,
  });

  const vendedores = await Usuario.findAll({
    where: {
      rol: 'vendedor',
      activo: true,
      id: { [Op.ne]: SUPER_USER_ID },
    },
    attributes: ['id', 'username', 'nombre_completo'],
  });

  const porUsuario = new Map(
    agregados.map((row) => [
      Number(row.usuario_id),
      {
        cantidad_ventas: Number(row.cantidad_ventas || 0),
        total_vendido: parseFloat(row.total_vendido || 0),
      },
    ])
  );

  const ranking = vendedores
    .map((vendedor) => {
      const stats = porUsuario.get(vendedor.id) || {
        cantidad_ventas: 0,
        total_vendido: 0,
      };
      return {
        vendedor: vendedor.toJSON(),
        cantidad_ventas: stats.cantidad_ventas,
        total_vendido: stats.total_vendido,
      };
    })
    .sort((a, b) => b.total_vendido - a.total_vendido);

  return {
    ranking,
    totales: {
      cantidad: ranking.reduce((s, r) => s + r.cantidad_ventas, 0),
      total: ranking.reduce((s, r) => s + r.total_vendido, 0),
    },
  };
}

// Reporte general de ventas
router.get('/ventas', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, evento_id, funcion_id } = req.query;
    const data = await obtenerVentasReporte({
      fecha_inicio,
      fecha_fin,
      evento_id,
      funcion_id,
    });
    res.json({
      ...data,
      filtros: { fecha_inicio, fecha_fin, evento_id, funcion_id },
    });
  } catch (error) {
    console.error('Error en reporte de ventas:', error);
    res.status(500).json({ error: 'Error al generar reporte de ventas.' });
  }
});

router.get('/ventas.pdf', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, evento_id, funcion_id } = req.query;
    const data = await obtenerVentasReporte({
      fecha_inicio,
      fecha_fin,
      evento_id,
      funcion_id,
    });
    getPdfService().generarPdfVentas(res, {
      ...data,
      filtros: { fecha_inicio, fecha_fin, evento_id, funcion_id },
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
    const { fecha_inicio, fecha_fin, evento_id, funcion_id } = req.query;
    const data = await obtenerRanking({
      fecha_inicio,
      fecha_fin,
      evento_id,
      funcion_id,
    });
    getPdfService().generarPdfRanking(res, data);
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
    const { fecha_inicio, fecha_fin, evento_id, funcion_id } = req.query;
    const data = await obtenerRanking({
      fecha_inicio,
      fecha_fin,
      evento_id,
      funcion_id,
    });
    res.json(data);
  } catch (error) {
    console.error('Error en ranking de vendedores:', error);
    res.status(500).json({ error: 'Error al generar ranking de vendedores.' });
  }
});

// Estadísticas por función
router.get('/funcion/:funcionId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const funcion = await Funcion.findByPk(req.params.funcionId, {
      include: [{ model: Evento, as: 'evento' }],
    });

    if (!funcion) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }

    const ventas = await Venta.findAll({
      where: { funcion_id: funcion.id },
      attributes: ['id', 'precio_unitario', 'asiento_id'],
      include: [
        {
          model: Asiento,
          as: 'asiento',
          attributes: ['id', 'seccion_id'],
        },
      ],
    });

    const porSeccion = {};
    ventas.forEach((venta) => {
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
      por_seccion: porSeccion,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar estadísticas.' });
  }
});

// Dashboard - resumen general
router.get('/dashboard', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (useTurso) {
      const { tursoGet } = require('../config/tursoQuery');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const hoyIso = hoy.toISOString();

      const [eventos, funciones, ventasHoy, vendedores] = await Promise.all([
        tursoGet('SELECT COUNT(*) AS total FROM eventos WHERE activo = 1'),
        tursoGet('SELECT COUNT(*) AS total FROM funciones WHERE activo = 1'),
        tursoGet(
          `SELECT COUNT(*) AS cantidad, COALESCE(SUM(precio_unitario), 0) AS total
           FROM ventas WHERE fecha_venta >= ?`,
          [hoyIso]
        ),
        tursoGet(
          `SELECT COUNT(*) AS total FROM usuarios
           WHERE rol = 'vendedor' AND activo = 1 AND id != ?`,
          [SUPER_USER_ID]
        ),
      ]);

      return res.json({
        eventos_activos: Number(eventos?.total || 0),
        funciones_activas: Number(funciones?.total || 0),
        ventas_hoy: {
          cantidad: Number(ventasHoy?.cantidad || 0),
          total: parseFloat(ventasHoy?.total || 0),
        },
        vendedores_activos: Number(vendedores?.total || 0),
      });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [eventosActivos, funcionesActivas, ventasHoyAgg, vendedoresActivos] =
      await Promise.all([
        Evento.count({ where: { activo: true } }),
        Funcion.count({ where: { activo: true } }),
        Venta.findAll({
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
            [sequelize.fn('SUM', sequelize.col('precio_unitario')), 'total'],
          ],
          where: { fecha_venta: { [Op.gte]: hoy } },
          raw: true,
        }),
        Usuario.count({
          where: {
            rol: 'vendedor',
            activo: true,
            id: { [Op.ne]: SUPER_USER_ID },
          },
        }),
      ]);

    const ventasHoy = ventasHoyAgg[0] || {};
    res.json({
      eventos_activos: eventosActivos,
      funciones_activas: funcionesActivas,
      ventas_hoy: {
        cantidad: Number(ventasHoy.cantidad || 0),
        total: parseFloat(ventasHoy.total || 0),
      },
      vendedores_activos: vendedoresActivos,
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
        total: 0,
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
  if (useTurso) {
    const { tursoGet, tursoAll } = require('../config/tursoQuery');
    const funcion = await tursoGet(
      `SELECT f.id, f.evento_id, f.fecha_hora, f.lugar, f.activo,
              e.id AS evento_id, e.nombre AS evento_nombre
       FROM funciones f
       JOIN eventos e ON e.id = f.evento_id
       WHERE f.id = ?
       LIMIT 1`,
      [Number(funcionId)]
    );
    if (!funcion) return null;

    const rows = await tursoAll(
      `SELECT
         v.cliente_nombre, v.cliente_tel, v.cliente_email,
         v.metodo_pago, v.precio_unitario,
         a.fila, a.numero, s.nombre AS seccion_nombre
       FROM ventas v
       JOIN asientos a ON a.id = v.asiento_id
       JOIN secciones s ON s.id = a.seccion_id
       WHERE v.funcion_id = ?
       ORDER BY v.cliente_nombre ASC`,
      [Number(funcionId)]
    );

    const ventas = rows.map((row) => ({
      cliente_nombre: row.cliente_nombre,
      cliente_tel: row.cliente_tel,
      cliente_email: row.cliente_email,
      metodo_pago: row.metodo_pago,
      precio_unitario: row.precio_unitario,
      asiento: {
        fila: row.fila,
        numero: row.numero,
        seccion: { nombre: row.seccion_nombre },
      },
    }));

    const clientes = agruparClientes(ventas);
    const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario || 0), 0);
    return {
      funcion: {
        id: funcion.id,
        evento_id: funcion.evento_id,
        fecha_hora: funcion.fecha_hora,
        lugar: funcion.lugar,
        activo: funcion.activo,
        evento: { id: funcion.evento_id, nombre: funcion.evento_nombre },
      },
      clientes,
      cantidad: ventas.length,
      total,
    };
  }

  const funcion = await Funcion.findByPk(funcionId, {
    include: [{ model: Evento, as: 'evento' }],
  });
  if (!funcion) return null;

  const ventas = await Venta.findAll({
    where: { funcion_id: funcion.id },
    include: [
      { model: Asiento, as: 'asiento', include: [{ model: Seccion, as: 'seccion' }] },
    ],
    order: [['cliente_nombre', 'ASC']],
  });

  const clientes = agruparClientes(ventas);
  const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);
  return {
    funcion: funcion.toJSON(),
    clientes,
    cantidad: ventas.length,
    total,
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
    getPdfService().generarPdfListaPuerta(res, lista);
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
    await getExcelService().generarExcelListaPuerta(res, lista);
  } catch (error) {
    console.error('Error al generar Excel de lista:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar Excel de lista de entrada.' });
    }
  }
});

module.exports = router;
