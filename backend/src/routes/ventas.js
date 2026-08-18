const express = require('express');
const { sequelize, Funcion, Asiento, Seccion, Venta, Evento, Usuario } = require('../models');
const { authMiddleware, requireVendedor } = require('../middleware/auth');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

const router = express.Router();

// Registrar una o varias ventas (mismo cliente)
router.post('/', authMiddleware, requireVendedor, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      funcion_id,
      asiento_id,
      asiento_ids,
      cliente_nombre,
      cliente_tel,
      cliente_email,
      metodo_pago,
      referencia_pago
    } = req.body;

    const ids = Array.isArray(asiento_ids) && asiento_ids.length
      ? [...new Set(asiento_ids.map(Number))]
      : asiento_id
        ? [Number(asiento_id)]
        : [];

    if (!funcion_id || !ids.length || !cliente_nombre) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Función, asiento(s) y nombre del cliente son requeridos.' });
    }

    const metodo = metodo_pago || 'efectivo';
    if (metodo === 'transferencia' && !String(referencia_pago || '').trim()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'El número de transferencia es requerido.' });
    }

    const funcion = await Funcion.findByPk(funcion_id, {
      include: [{ model: Evento, as: 'evento' }],
      transaction
    });

    if (!funcion || !funcion.activo) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Función no encontrada o inactiva.' });
    }

    const ventasCreadas = [];
    const asientosInfo = [];

    for (const id of ids) {
      const asiento = await Asiento.findByPk(id, {
        include: [{ model: Seccion, as: 'seccion' }],
        transaction
      });

      if (!asiento) {
        await transaction.rollback();
        return res.status(404).json({ error: `Asiento ${id} no encontrado.` });
      }

      if (asiento.estado === 'bloqueado') {
        await transaction.rollback();
        return res.status(400).json({
          error: `El asiento ${asiento.fila}${asiento.numero} está bloqueado.`
        });
      }

      if (asiento.estado === 'vendido') {
        await transaction.rollback();
        return res.status(400).json({
          error: `El asiento ${asiento.fila}${asiento.numero} ya está vendido.`
        });
      }

      if (asiento.estado === 'reservado') {
        const vigente =
          asiento.reservado_hasta && new Date(asiento.reservado_hasta) > new Date();
        const esMia = asiento.reservado_por === req.usuario.id;
        if (vigente && !esMia) {
          await transaction.rollback();
          return res.status(409).json({
            error: `El asiento ${asiento.fila}${asiento.numero} está reservado por otro vendedor.`
          });
        }
      }

      const ventaExistente = await Venta.findOne({
        where: { funcion_id, asiento_id: id },
        transaction
      });

      if (ventaExistente) {
        await transaction.rollback();
        return res.status(400).json({
          error: `El asiento ${asiento.fila}${asiento.numero} ya fue vendido en esta función.`
        });
      }

      const venta = await Venta.create({
        funcion_id,
        asiento_id: id,
        usuario_id: req.usuario.id,
        cliente_nombre,
        cliente_tel: cliente_tel || null,
        cliente_email: cliente_email || null,
        metodo_pago: metodo,
        referencia_pago: metodo === 'transferencia' ? String(referencia_pago).trim() : null,
        precio_unitario: asiento.seccion.precio
      }, { transaction });

      await asiento.update({
        estado: 'vendido',
        reservado_por: null,
        reservado_hasta: null
      }, { transaction });

      ventasCreadas.push(venta);
      asientosInfo.push({
        seccion: asiento.seccion.nombre,
        asiento: `${asiento.fila}${asiento.numero}`,
        precio: asiento.seccion.precio
      });
    }

    await transaction.commit();

    const total = asientosInfo.reduce((s, a) => s + parseFloat(a.precio), 0);

    if (cliente_email) {
      const datosEmail = {
        numeroVenta: ventasCreadas.map((v) => v.id).join(', '),
        evento: funcion.evento.nombre,
        funcion: funcion.fecha_hora,
        lugar: funcion.lugar || '',
        seccion: asientosInfo.map((a) => a.seccion).join(', '),
        asiento: asientosInfo.map((a) => a.asiento).join(', '),
        asientos: asientosInfo.map((a) => `${a.seccion} ${a.asiento}`).join(', '),
        telefono: cliente_tel || '',
        precio: total,
        metodo_pago: metodo,
        referencia_pago: metodo === 'transferencia' ? String(referencia_pago).trim() : null
      };
      await emailService.enviarConfirmacionCompra(cliente_email, cliente_nombre, datosEmail);
    }

    res.status(201).json({
      message: ids.length > 1
        ? `${ids.length} ventas registradas correctamente`
        : 'Venta registrada correctamente',
      ventas: ventasCreadas,
      total,
      cantidad: ventasCreadas.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al registrar venta:', error);
    res.status(500).json({ error: 'Error al registrar venta.' });
  }
});

// Obtener ventas de una función
router.get('/funcion/:funcionId', authMiddleware, async (req, res) => {
  try {
    const ventas = await Venta.findAll({
      where: { funcion_id: req.params.funcionId },
      include: [
        {
          model: Asiento,
          as: 'asiento',
          include: [{ model: Seccion, as: 'seccion' }]
        },
        {
          model: Usuario,
          as: 'vendedor',
          attributes: ['id', 'username', 'nombre_completo']
        }
      ],
      order: [['fecha_venta', 'DESC']]
    });

    // Calcular total
    const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

    res.json({
      ventas,
      total,
      cantidad: ventas.length
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas.' });
  }
});

// Obtener ventas por vendedor
router.get('/vendedor/:usuarioId', authMiddleware, async (req, res) => {
  try {
    const ventas = await Venta.findAll({
      where: { usuario_id: req.params.usuarioId },
      include: [
        {
          model: Funcion,
          as: 'funcion',
          include: [{ model: Evento, as: 'evento' }]
        },
        { model: Asiento, as: 'asiento' }
      ],
      order: [['fecha_venta', 'DESC']]
    });

    const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

    res.json({
      ventas,
      total,
      cantidad: ventas.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas.' });
  }
});

// Obtener mis ventas (usuario actual)
router.get('/mis-ventas', authMiddleware, requireVendedor, async (req, res) => {
  try {
    const ventas = await Venta.findAll({
      where: { usuario_id: req.usuario.id },
      include: [
        {
          model: Funcion,
          as: 'funcion',
          include: [{ model: Evento, as: 'evento' }]
        },
        { model: Asiento, as: 'asiento' }
      ],
      order: [['fecha_venta', 'DESC']]
    });

    const total = ventas.reduce((sum, v) => sum + parseFloat(v.precio_unitario), 0);

    res.json({
      ventas,
      total,
      cantidad: ventas.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas.' });
  }
});

// Cancelar venta (solo admin)
router.delete('/:id', authMiddleware, requireVendedor, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const venta = await Venta.findByPk(req.params.id, { transaction });

    if (!venta) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }

    // Solo admin puede cancelar cualquier venta
    // Vendedor solo puede cancelar sus propias ventas
    if (req.usuario.rol !== 'admin' && venta.usuario_id !== req.usuario.id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No puedes cancelar esta venta.' });
    }

    // Liberar el asiento
    await Asiento.update(
      { estado: 'disponible', reservado_por: null, reservado_hasta: null },
      { where: { id: venta.asiento_id }, transaction }
    );

    // Eliminar la venta
    await venta.destroy({ transaction });

    await transaction.commit();

    res.json({ message: 'Venta cancelada correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al cancelar venta:', error);
    res.status(500).json({ error: 'Error al cancelar venta.' });
  }
});

module.exports = router;
