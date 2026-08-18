const express = require('express');
const { Evento, Seccion, Asiento } = require('../models');
const { useTurso } = require('../config/database');
const { tursoAll } = require('../config/tursoQuery');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Obtener secciones de un evento (sin asientos — se cargan por sección bajo demanda)
router.get('/evento/:eventoId', authMiddleware, async (req, res) => {
  try {
    const eventoId = Number(req.params.eventoId);

    if (useTurso) {
      const secciones = await tursoAll(
        `SELECT id, nombre, precio, color, capacidad, evento_id, activo
         FROM secciones WHERE evento_id = ? AND activo = 1 ORDER BY nombre ASC`,
        [eventoId]
      );
      return res.json({ secciones });
    }

    const secciones = await Seccion.findAll({
      where: { evento_id: req.params.eventoId, activo: true },
      attributes: ['id', 'nombre', 'precio', 'color', 'capacidad', 'evento_id', 'activo'],
      order: [['nombre', 'ASC']],
    });
    res.json({ secciones });
  } catch (error) {
    console.error('Error al obtener secciones:', error);
    res.status(500).json({ error: 'Error al obtener secciones.' });
  }
});

// Obtener sección por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const seccion = await Seccion.findByPk(req.params.id, {
      include: [
        { model: Evento, as: 'evento' },
        { model: Asiento, as: 'asientos' }
      ]
    });

    if (!seccion) {
      return res.status(404).json({ error: 'Sección no encontrada.' });
    }

    res.json({ seccion });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sección.' });
  }
});

// Crear sección (solo admin)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { evento_id, nombre, precio, color, capacidad } = req.body;

    if (!evento_id || !nombre) {
      return res.status(400).json({ error: 'Evento y nombre son requeridos.' });
    }

    const evento = await Evento.findByPk(evento_id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    const seccion = await Seccion.create({
      evento_id,
      nombre,
      precio: precio || 0,
      color: color || '#3B82F6',
      capacidad: capacidad || 0
    });

    res.status(201).json({ message: 'Sección creada correctamente', seccion });
  } catch (error) {
    console.error('Error al crear sección:', error);
    res.status(500).json({ error: 'Error al crear sección.' });
  }
});

// Actualizar sección (solo admin)
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const seccion = await Seccion.findByPk(req.params.id);

    if (!seccion) {
      return res.status(404).json({ error: 'Sección no encontrada.' });
    }

    const { nombre, precio, color, capacidad, activo } = req.body;

    await seccion.update({ nombre, precio, color, capacidad, activo });

    res.json({ message: 'Sección actualizada correctamente', seccion });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar sección.' });
  }
});

// Eliminar sección (solo admin)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const seccion = await Seccion.findByPk(req.params.id);

    if (!seccion) {
      return res.status(404).json({ error: 'Sección no encontrado.' });
    }

    await seccion.update({ activo: false });

    res.json({ message: 'Sección eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar sección.' });
  }
});

module.exports = router;
