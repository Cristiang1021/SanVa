const express = require('express');
const { Seccion, Asiento } = require('../models');
const { authMiddleware, requireAdmin, requireVendedor } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

const HOLD_MS = 5 * 60 * 1000; // 5 minutos

async function liberarReservasExpiradas(whereExtra = {}) {
  await Asiento.update(
    {
      estado: 'disponible',
      reservado_por: null,
      reservado_hasta: null
    },
    {
      where: {
        estado: 'reservado',
        reservado_hasta: { [Op.lt]: new Date() },
        ...whereExtra
      }
    }
  );
}

// Obtener asientos de una sección
router.get('/seccion/:seccionId', authMiddleware, async (req, res) => {
  try {
    await liberarReservasExpiradas({ seccion_id: req.params.seccionId });

    const asientos = await Asiento.findAll({
      where: { seccion_id: req.params.seccionId },
      order: [
        ['fila', 'ASC'],
        ['numero', 'ASC']
      ]
    });
    res.json({ asientos });
  } catch (error) {
    console.error('Error al obtener asientos:', error);
    res.status(500).json({ error: 'Error al obtener asientos.' });
  }
});

// Reservar asiento temporalmente (vendedor)
router.post('/:id/reservar', authMiddleware, requireVendedor, async (req, res) => {
  try {
    await liberarReservasExpiradas({ id: req.params.id });

    const asiento = await Asiento.findByPk(req.params.id);
    if (!asiento) {
      return res.status(404).json({ error: 'Asiento no encontrado.' });
    }

    if (asiento.estado === 'vendido') {
      return res.status(409).json({ error: 'El asiento ya está vendido.' });
    }
    if (asiento.estado === 'bloqueado') {
      return res.status(409).json({ error: 'El asiento está bloqueado.' });
    }

    const ahora = new Date();
    const esMia =
      asiento.estado === 'reservado' &&
      asiento.reservado_por === req.usuario.id &&
      asiento.reservado_hasta &&
      new Date(asiento.reservado_hasta) > ahora;

    if (asiento.estado === 'reservado' && !esMia) {
      return res.status(409).json({ error: 'El asiento está siendo reservado por otro vendedor.' });
    }

    const hasta = new Date(Date.now() + HOLD_MS);
    await asiento.update({
      estado: 'reservado',
      reservado_por: req.usuario.id,
      reservado_hasta: hasta
    });

    res.json({
      message: 'Asiento reservado temporalmente',
      asiento,
      reservado_hasta: hasta
    });
  } catch (error) {
    console.error('Error al reservar asiento:', error);
    res.status(500).json({ error: 'Error al reservar asiento.' });
  }
});

// Liberar reserva (vendedor dueño o admin)
router.post('/:id/liberar', authMiddleware, requireVendedor, async (req, res) => {
  try {
    const asiento = await Asiento.findByPk(req.params.id);
    if (!asiento) {
      return res.status(404).json({ error: 'Asiento no encontrado.' });
    }

    if (asiento.estado !== 'reservado') {
      return res.json({ message: 'El asiento no está reservado', asiento });
    }

    const esDueño = asiento.reservado_por === req.usuario.id;
    const esAdmin = req.usuario.rol === 'admin';
    if (!esDueño && !esAdmin) {
      return res.status(403).json({ error: 'No puedes liberar la reserva de otro vendedor.' });
    }

    await asiento.update({
      estado: 'disponible',
      reservado_por: null,
      reservado_hasta: null
    });

    res.json({ message: 'Reserva liberada', asiento });
  } catch (error) {
    console.error('Error al liberar asiento:', error);
    res.status(500).json({ error: 'Error al liberar asiento.' });
  }
});

// Generar asientos automáticamente (solo admin)
router.post('/generar', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { seccion_id, filas, asientosPorFila, inicioFila = 'A' } = req.body;

    if (!seccion_id || !filas || !asientosPorFila) {
      return res.status(400).json({ error: 'Sección, número de filas y asientos por fila son requeridos.' });
    }

    const seccion = await Seccion.findByPk(seccion_id);
    if (!seccion) {
      return res.status(404).json({ error: 'Sección no encontrada.' });
    }

    const asientosExistentes = await Asiento.count({ where: { seccion_id } });
    if (asientosExistentes > 0) {
      return res.status(400).json({
        error: 'Ya existen asientos en esta sección. Elimínelos primero o actualícelos manualmente.'
      });
    }

    const asientos = [];
    const inicioCodigo = inicioFila.charCodeAt(0);

    for (let f = 0; f < filas; f++) {
      const letraFila = String.fromCharCode(inicioCodigo + f);

      for (let n = 1; n <= asientosPorFila; n++) {
        asientos.push({
          seccion_id,
          fila: letraFila,
          numero: n,
          posicion_x: n - 1,
          posicion_y: f,
          estado: 'disponible'
        });
      }
    }

    await Asiento.bulkCreate(asientos);
    await seccion.update({ capacidad: asientos.length });

    res.status(201).json({
      message: `Se generaron ${asientos.length} asientos correctamente`,
      cantidad: asientos.length
    });
  } catch (error) {
    console.error('Error al generar asientos:', error);
    res.status(500).json({ error: 'Error al generar asientos.' });
  }
});

// Bloquear/desbloquear un asiento
router.put('/:id/bloquear', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const asiento = await Asiento.findByPk(req.params.id);

    if (!asiento) {
      return res.status(404).json({ error: 'Asiento no encontrado.' });
    }

    const nuevoEstado = asiento.estado === 'bloqueado' ? 'disponible' : 'bloqueado';
    await asiento.update({
      estado: nuevoEstado,
      reservado_por: null,
      reservado_hasta: null
    });

    res.json({ message: `Asiento ${nuevoEstado === 'bloqueado' ? 'bloqueado' : 'desbloqueado'} correctamente`, asiento });
  } catch (error) {
    res.status(500).json({ error: 'Error al bloquear/desbloquear asiento.' });
  }
});

// Bloquear múltiples asientos
router.post('/bloquear-masivo', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { asientos_ids, accion } = req.body;

    if (!asientos_ids || !Array.isArray(asientos_ids) || asientos_ids.length === 0) {
      return res.status(400).json({ error: 'IDs de asientos requeridos.' });
    }

    const nuevoEstado = accion === 'bloquear' ? 'bloqueado' : 'disponible';

    await Asiento.update(
      {
        estado: nuevoEstado,
        reservado_por: null,
        reservado_hasta: null
      },
      { where: { id: { [Op.in]: asientos_ids } } }
    );

    res.json({ message: `${asientos_ids.length} asientos ${nuevoEstado === 'bloqueado' ? 'bloqueados' : 'desbloqueados'} correctamente` });
  } catch (error) {
    console.error('Error en bloqueo masivo:', error);
    res.status(500).json({ error: 'Error al bloquear asientos.' });
  }
});

// Eliminar todos los asientos de una sección
router.delete('/seccion/:seccionId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const resultado = await Asiento.destroy({
      where: { seccion_id: req.params.seccionId }
    });

    await Seccion.update(
      { capacidad: 0 },
      { where: { id: req.params.seccionId } }
    );

    res.json({ message: `${resultado} asientos eliminados correctamente` });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar asientos.' });
  }
});

module.exports = router;
