const express = require('express');
const { Evento, Seccion, Funcion } = require('../models');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { inicializarTeatro } = require('../../scripts/inicializar-teatro');
const { parseImagenBase64 } = require('../utils/imagen');

const router = express.Router();

function imagenDesdeBody(body) {
  if (!body?.imagen_base64) return undefined;
  if (body.imagen_base64 === '' || body.imagen_base64 === null) return null;
  return parseImagenBase64(body.imagen_base64);
}

// Obtener todos los eventos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      where: { activo: true },
      include: [
        { model: Seccion, as: 'secciones', attributes: ['id', 'nombre', 'precio', 'color', 'capacidad'] },
        { model: Funcion, as: 'funciones', attributes: ['id', 'fecha_hora', 'lugar'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ eventos });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos.' });
  }
});

// Obtener evento por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id, {
      include: [
        { model: Seccion, as: 'secciones' },
        { model: Funcion, as: 'funciones' }
      ]
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    res.json({ evento });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener evento.' });
  }
});

// Crear evento (solo admin)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, fecha_unica, hora_unica, imagen_base64 } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del evento es requerido.' });
    }

    const hora = hora_unica || '20:00';

    const data = {
      nombre,
      descripcion: descripcion || null,
      fecha_unica: fecha_unica || null,
      hora_unica: fecha_unica ? hora : null
    };

    if (imagen_base64 !== undefined) {
      data.imagen_url = imagenDesdeBody(req.body);
    }

    const evento = await Evento.create(data);

    // Si tiene fecha única, crear automáticamente una función ese día/hora
    if (fecha_unica) {
      await Funcion.create({
        evento_id: evento.id,
        fecha_hora: new Date(`${fecha_unica}T${hora}:00`),
        lugar: 'Sanva Shows',
        activo: true
      });
    }

    const eventoCompleto = await Evento.findByPk(evento.id, {
      include: [
        { model: Seccion, as: 'secciones' },
        { model: Funcion, as: 'funciones' }
      ]
    });

    res.status(201).json({ message: 'Evento creado correctamente', evento: eventoCompleto });
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(error.message?.includes('imagen') ? 400 : 500).json({
      error: error.message || 'Error al crear evento.'
    });
  }
});

// Inicializar teatro
router.post('/:id/inicializar', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    const resultado = await inicializarTeatro(req.params.id);

    if (resultado) {
      res.json({ message: 'Teatro inicializado correctamente' });
    } else {
      res.status(500).json({ error: 'Error al inicializar el teatro.' });
    }
  } catch (error) {
    console.error('Error al inicializar teatro:', error);
    res.status(500).json({ error: 'Error al inicializar teatro.' });
  }
});

// Actualizar evento (solo admin)
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    const { nombre, descripcion, activo, fecha_unica, hora_unica, imagen_base64 } = req.body;
    const updates = {};

    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (activo !== undefined) updates.activo = activo === true || activo === 'true';
    if (fecha_unica !== undefined) {
      updates.fecha_unica = fecha_unica || null;
      updates.hora_unica = fecha_unica ? (hora_unica || '20:00') : null;
    } else if (hora_unica !== undefined && evento.fecha_unica) {
      updates.hora_unica = hora_unica || null;
    }

    if (imagen_base64 !== undefined) {
      updates.imagen_url = imagenDesdeBody(req.body);
    }

    await evento.update(updates);

    res.json({ message: 'Evento actualizado correctamente', evento });
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(error.message?.includes('imagen') ? 400 : 500).json({
      error: error.message || 'Error al actualizar evento.'
    });
  }
});

// Eliminar evento (solo admin) - Soft delete
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    await evento.update({ activo: false });

    res.json({ message: 'Evento eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar evento.' });
  }
});

module.exports = router;
