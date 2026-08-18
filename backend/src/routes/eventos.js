const express = require('express');
const { Evento, Seccion, Funcion } = require('../models');
const { useTurso } = require('../config/database');
const { getTursoClient } = require('../config/tursoClient');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { inicializarTeatro } = require('../../scripts/inicializar-teatro');
const { imagenDesdeBody, serializarEvento, parseImagenBase64, toNodeBuffer } = require('../utils/imagen');

const router = express.Router();

const EVENTO_INCLUDES = [
  { model: Seccion, as: 'secciones' },
  { model: Funcion, as: 'funciones' },
];

const LIST_INCLUDES = [
  { model: Seccion, as: 'secciones', attributes: ['id', 'nombre', 'precio', 'color', 'capacidad'] },
  { model: Funcion, as: 'funciones', attributes: ['id', 'fecha_hora', 'lugar'] },
];

const cargarImagenEvento = async (id) => {
  if (useTurso) {
    const client = getTursoClient();
    const result = await client.execute({
      sql: `SELECT id, imagen_data, imagen_mime, imagen_url, activo
            FROM eventos WHERE id = ? AND activo = 1 LIMIT 1`,
      args: [Number(id)],
    });
    if (!result.rows.length) return null;

    const row = result.rows[0];
    const col = (name) => {
      const i = result.columns.indexOf(name);
      return i >= 0 ? row[i] : undefined;
    };

    return {
      id: col('id'),
      activo: col('activo'),
      imagen_data: col('imagen_data'),
      imagen_mime: col('imagen_mime'),
      imagen_url: col('imagen_url'),
    };
  }

  return Evento.unscoped().findByPk(id, {
    attributes: ['id', 'imagen_data', 'imagen_mime', 'imagen_url', 'activo'],
  });
};

// Imagen binaria del evento (público: las etiquetas <img> no envían JWT)
router.get('/:id/imagen', async (req, res) => {
  try {
    const evento = await cargarImagenEvento(req.params.id);

    if (!evento || !evento.activo) {
      return res.status(404).json({ error: 'Imagen no encontrada.' });
    }

    const bytes = toNodeBuffer(evento.imagen_data);
    if (bytes && bytes.length) {
      res.set('Content-Type', evento.imagen_mime || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Content-Length', String(bytes.length));
      return res.end(bytes);
    }

    if (evento.imagen_url?.startsWith('data:')) {
      const parsed = parseImagenBase64(evento.imagen_url);
      res.set('Content-Type', parsed.mime);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.end(parsed.buffer);
    }

    return res.status(404).json({ error: 'Imagen no encontrada.' });
  } catch (error) {
    console.error('Error al servir imagen:', error);
    res.status(500).json({ error: 'Error al cargar imagen.' });
  }
});

// Obtener todos los eventos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      where: { activo: true },
      include: LIST_INCLUDES,
      order: [['created_at', 'DESC']],
    });
    res.json({ eventos: eventos.map(serializarEvento) });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos.' });
  }
});

// Obtener evento por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id, {
      include: EVENTO_INCLUDES,
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    res.json({ evento: serializarEvento(evento) });
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
      hora_unica: fecha_unica ? hora : null,
    };

    const imagen = imagenDesdeBody(req.body);
    if (imagen !== undefined) Object.assign(data, imagen);

    const evento = await Evento.create(data);

    if (fecha_unica) {
      await Funcion.create({
        evento_id: evento.id,
        fecha_hora: new Date(`${fecha_unica}T${hora}:00`),
        lugar: 'Sanva Shows',
        activo: true,
      });
    }

    const eventoCompleto = await Evento.findByPk(evento.id, {
      include: EVENTO_INCLUDES,
    });

    res.status(201).json({
      message: 'Evento creado correctamente',
      evento: serializarEvento(eventoCompleto),
    });
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(error.message?.includes('imagen') ? 400 : 500).json({
      error: error.message || 'Error al crear evento.',
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

    const { nombre, descripcion, activo, fecha_unica, hora_unica } = req.body;
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

    const imagen = imagenDesdeBody(req.body);
    if (imagen !== undefined) Object.assign(updates, imagen);

    await evento.update(updates);

    const eventoActualizado = await Evento.findByPk(evento.id, {
      include: EVENTO_INCLUDES,
    });

    res.json({
      message: 'Evento actualizado correctamente',
      evento: serializarEvento(eventoActualizado),
    });
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(error.message?.includes('imagen') ? 400 : 500).json({
      error: error.message || 'Error al actualizar evento.',
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
