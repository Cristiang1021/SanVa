const express = require('express');
const { Evento, Funcion, Venta, Asiento, Seccion } = require('../models');
const { authMiddleware, requireAdmin, requireVendedor } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

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
        attributes: ['id', 'nombre', 'precio', 'color', 'capacidad'],
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
