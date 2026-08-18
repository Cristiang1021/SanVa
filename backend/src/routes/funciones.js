const express = require('express');
const { Evento, Funcion, Venta, Asiento, Seccion } = require('../models');
const { useTurso } = require('../config/database');
const { tursoAll, tursoGet } = require('../config/tursoQuery');
const { authMiddleware, requireAdmin, requireVendedor } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

const SQL_ASIENTOS_SECCION = `
  SELECT seccion_id, COUNT(*) AS total
  FROM asientos
  WHERE seccion_id IN (SELECT id FROM secciones WHERE evento_id = ? AND activo = 1)
  GROUP BY seccion_id
`;

// Pantalla admin secciones: función + secciones en una sola petición (Turso HTTP)
router.get('/:id/admin-setup', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (useTurso) {
      const funcion = await tursoGet(
        `SELECT id, evento_id, fecha_hora, lugar, activo
         FROM funciones WHERE id = ? LIMIT 1`,
        [id]
      );
      if (!funcion) {
        return res.status(404).json({ error: 'Función no encontrada.' });
      }

      const [secciones, conteos] = await Promise.all([
        tursoAll(
          `SELECT id, nombre, precio, color, capacidad, evento_id, activo, layout_key
           FROM secciones WHERE evento_id = ? AND activo = 1 ORDER BY nombre ASC`,
          [funcion.evento_id]
        ),
        tursoAll(SQL_ASIENTOS_SECCION, [funcion.evento_id]),
      ]);

      const conteoPorSeccion = Object.fromEntries(
        conteos.map((c) => [c.seccion_id, Number(c.total)])
      );

      return res.json({
        funcion,
        secciones: secciones.map((s) => ({
          ...s,
          asientos_count: conteoPorSeccion[s.id] || 0,
        })),
      });
    }

    const funcion = await Funcion.findByPk(id, {
      attributes: ['id', 'evento_id', 'fecha_hora', 'lugar', 'activo'],
    });
    if (!funcion) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }

    const secciones = await Seccion.findAll({
      where: { evento_id: funcion.evento_id, activo: true },
      attributes: ['id', 'nombre', 'precio', 'color', 'capacidad', 'evento_id', 'activo', 'layout_key'],
      order: [['nombre', 'ASC']],
    });

    const seccionIds = secciones.map((s) => s.id);
    let conteoPorSeccion = {};
    if (seccionIds.length) {
      const rows = await Asiento.findAll({
        attributes: ['seccion_id', [Asiento.sequelize.fn('COUNT', '*'), 'total']],
        where: { seccion_id: seccionIds },
        group: ['seccion_id'],
        raw: true,
      });
      conteoPorSeccion = Object.fromEntries(
        rows.map((r) => [r.seccion_id, Number(r.total)])
      );
    }

    res.json({
      funcion,
      secciones: secciones.map((s) => ({
        ...s.toJSON(),
        asientos_count: conteoPorSeccion[s.id] || 0,
      })),
    });
  } catch (error) {
    console.error('Error admin-setup función:', error);
    res.status(500).json({ error: 'Error al cargar datos de la función.' });
  }
});

// Obtener funciones de un evento
router.get('/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const funciones = await Funcion.findAll({
      where: { evento_id: req.params.eventoId, activo: true },
      order: [['fecha_hora', 'ASC']]
    });
    res.json({ funciones });
  } catch (error) {
    console.error('Error al obtener funciones:', error);
    res.status(500).json({ error: 'Error al obtener funciones.' });
  }
});

// Obtener función por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const funcion = await Funcion.findByPk(req.params.id, {
      include: [
        { model: Evento, as: 'evento' }
      ]
    });

    if (!funcion) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }

    res.json({ funcion });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener función.' });
  }
});

// Obtener estado de asientos para una función (ligero: sin cargar 384 asientos de golpe)
router.get('/:id/estado', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (useTurso) {
      const funcion = await tursoGet(
        `SELECT f.id, f.evento_id, f.fecha_hora, f.lugar, f.activo, e.nombre AS evento_nombre
         FROM funciones f
         JOIN eventos e ON e.id = f.evento_id
         WHERE f.id = ? LIMIT 1`,
        [id]
      );

      if (!funcion) {
        return res.status(404).json({ error: 'Función no encontrada.' });
      }

      const [secciones, vendidosRow, totalRow] = await Promise.all([
        tursoAll(
          `SELECT id, nombre, precio, color, capacidad, layout_key
           FROM secciones WHERE evento_id = ? AND activo = 1 ORDER BY nombre ASC`,
          [funcion.evento_id]
        ),
        tursoGet(
          `SELECT COUNT(*) AS total FROM ventas WHERE funcion_id = ?`,
          [id]
        ),
        tursoGet(
          `SELECT COUNT(*) AS total FROM asientos
           WHERE seccion_id IN (
             SELECT id FROM secciones WHERE evento_id = ? AND activo = 1
           )`,
          [funcion.evento_id]
        ),
      ]);

      const vendidosCount = Number(vendidosRow?.total || 0);
      const totalAsientos = Number(totalRow?.total || 0);

      return res.json({
        funcion: {
          id: funcion.id,
          evento_id: funcion.evento_id,
          fecha_hora: funcion.fecha_hora,
          lugar: funcion.lugar,
          activo: funcion.activo,
          evento: { id: funcion.evento_id, nombre: funcion.evento_nombre },
        },
        secciones,
        estadisticas: {
          total: totalAsientos,
          vendidos: vendidosCount,
          disponibles: totalAsientos - vendidosCount,
          ocupados: totalAsientos
            ? Math.round((vendidosCount / totalAsientos) * 100)
            : 0,
        },
      });
    }

    const funcion = await Funcion.findByPk(req.params.id, {
      attributes: ['id', 'evento_id', 'fecha_hora', 'lugar', 'activo'],
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'nombre'],
        },
      ],
    });

    if (!funcion) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }

    const [secciones, vendidosCount] = await Promise.all([
      Seccion.findAll({
        where: { evento_id: funcion.evento_id, activo: true },
        attributes: ['id', 'nombre', 'precio', 'color', 'capacidad', 'layout_key'],
        order: [['nombre', 'ASC']],
      }),
      Venta.count({ where: { funcion_id: funcion.id } }),
    ]);

    const seccionIds = secciones.map((s) => s.id);
    const totalAsientos = seccionIds.length
      ? await Asiento.count({ where: { seccion_id: seccionIds } })
      : 0;

    const seccionesJson = secciones.map((s) => s.toJSON());

    res.json({
      funcion,
      secciones: seccionesJson,
      estadisticas: {
        total: totalAsientos,
        vendidos: vendidosCount,
        disponibles: totalAsientos - vendidosCount,
        ocupados: totalAsientos
          ? Math.round((vendidosCount / totalAsientos) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({ error: 'Error al obtener estado de asientos.' });
  }
});

// Crear función (solo admin)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { evento_id, fecha_hora, lugar } = req.body;

    if (!evento_id || !fecha_hora) {
      return res.status(400).json({ error: 'Evento y fecha/hora son requeridos.' });
    }

    const evento = await Evento.findByPk(evento_id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    const funcion = await Funcion.create({
      evento_id,
      fecha_hora,
      lugar
    });

    res.status(201).json({ message: 'Función creada correctamente', funcion });
  } catch (error) {
    console.error('Error al crear función:', error);
    res.status(500).json({ error: 'Error al crear función.' });
  }
});

// Actualizar función (solo admin)
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const funcion = await Funcion.findByPk(req.params.id);

    if (!funcion) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }

    const { fecha_hora, lugar, activo } = req.body;

    await funcion.update({ fecha_hora, lugar, activo });

    res.json({ message: 'Función actualizada correctamente', funcion });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar función.' });
  }
});

// Eliminar función (solo admin)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const funcion = await Funcion.findByPk(req.params.id);

    if (!funcion) {
      return res.status(404).json({ error: 'Función no encontrada.' });
    }

    // Verificar si hay ventas
    const ventasCount = await Venta.count({ where: { funcion_id: funcion.id } });
    if (ventasCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la función. Hay ${ventasCount} ventas registradas.`
      });
    }

    await funcion.update({ activo: false });

    res.json({ message: 'Función eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar función.' });
  }
});

module.exports = router;
