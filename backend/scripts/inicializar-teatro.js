const { sequelize } = require('../src/config/database');
const { Seccion, Asiento, Venta } = require('../src/models');
const { Op } = require('sequelize');

const ESTRUCTURA_TEATRO = {
  platea: {
    nombre: 'Platea',
    precio: 100,
    color: '#10B981',
    asientos: [
      { fila: 'A', numeros: 12 },
      { fila: 'B', numeros: 15 },
      { fila: 'C', numeros: 16 },
      { fila: 'D', numeros: 16 },
      { fila: 'E', numeros: 14 },
      { fila: 'F', numeros: 16 },
      { fila: 'G', numeros: 16 },
      { fila: 'H', numeros: 15 },
      { fila: 'I', numeros: 14 },
      { fila: 'J', numeros: 16 },
      { fila: 'K', numeros: 16 },
      { fila: 'L', numeros: 15 },
      { fila: 'M', numeros: 6 },
      { fila: 'N', numeros: 15 },
    ],
  },
  palco1: {
    nombre: 'Palco 1',
    precio: 80,
    color: '#3B82F6',
    asientos: [{ fila: 'P', prefijo: 'p', numeros: 65 }],
  },
  palco2: {
    nombre: 'Palco 2',
    precio: 75,
    color: '#F59E0B',
    asientos: [{ fila: 'V', prefijo: 'v', numeros: 60 }],
  },
  palco3: {
    nombre: 'Palco 3',
    precio: 70,
    color: '#8B5CF6',
    asientos: [{ fila: 'Z', prefijo: 'z', numeros: 57 }],
  },
};

const BATCH_SIZE = 100;

function calcularCapacidad(asientos) {
  return asientos.reduce((sum, a) => sum + a.numeros, 0);
}

function generarAsientos(seccionId, configs) {
  const filas = [];
  for (const config of configs) {
    const filaFinal = config.prefijo || config.fila;
    for (let i = 1; i <= config.numeros; i++) {
      filas.push({
        seccion_id: seccionId,
        fila: filaFinal,
        numero: i,
        estado: 'disponible',
        posicion_x: 0,
        posicion_y: 0,
      });
    }
  }
  return filas;
}

async function bulkInsertAsientos(asientos, transaction) {
  for (let i = 0; i < asientos.length; i += BATCH_SIZE) {
    const lote = asientos.slice(i, i + BATCH_SIZE);
    await Asiento.bulkCreate(lote, { transaction });
  }
}

async function inicializarTeatro(eventoId) {
  const inicio = Date.now();
  const transaction = await sequelize.transaction();

  try {
    console.log(`Inicializando teatro para evento ${eventoId}...`);
    let totalAsientos = 0;

    for (const [layoutKey, seccionData] of Object.entries(ESTRUCTURA_TEATRO)) {
      let seccion = await Seccion.findOne({
        where: { evento_id: eventoId, layout_key: layoutKey },
        transaction,
      });

      if (!seccion) {
        seccion = await Seccion.findOne({
          where: { evento_id: eventoId, nombre: seccionData.nombre },
          transaction,
        });
        if (seccion) {
          await seccion.update({ layout_key: layoutKey }, { transaction });
        }
      }

      if (!seccion) {
        seccion = await Seccion.create(
          {
            evento_id: eventoId,
            nombre: seccionData.nombre,
            layout_key: layoutKey,
            precio: seccionData.precio,
            color: seccionData.color,
            capacidad: calcularCapacidad(seccionData.asientos),
            activo: true,
          },
          { transaction }
        );
      } else if (!seccion.layout_key) {
        await seccion.update({ layout_key: layoutKey }, { transaction });
      }

      const existentes = await Asiento.count({
        where: { seccion_id: seccion.id },
        transaction,
      });

      if (existentes > 0) {
        console.log(`✓ Sección ${seccionData.nombre} ya tiene ${existentes} asientos — omitiendo`);
        totalAsientos += existentes;
        continue;
      }

      const asientos = generarAsientos(seccion.id, seccionData.asientos);
      await bulkInsertAsientos(asientos, transaction);
      totalAsientos += asientos.length;
      console.log(`✓ Sección ${seccionData.nombre}: ${asientos.length} asientos`);
    }

    await transaction.commit();
    console.log(`✅ Teatro inicializado: ${totalAsientos} asientos en ${Date.now() - inicio}ms`);
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error inicializando teatro:', error.message);
    return false;
  }
}

function inferLayoutKeyFromAsientos(asientos) {
  const filas = new Set(asientos.map((a) => String(a.fila || '').toLowerCase()));
  if (filas.has('p')) return 'palco1';
  if (filas.has('v')) return 'palco2';
  if (filas.has('z')) return 'palco3';
  if (asientos.length) return 'platea';
  return null;
}

async function restaurarSeccion(seccionId) {
  const seccion = await Seccion.findByPk(seccionId);
  if (!seccion) {
    throw new Error('Sección no encontrada.');
  }

  const asientosActuales = await Asiento.findAll({
    where: { seccion_id: seccion.id },
    attributes: ['id', 'fila', 'numero'],
  });

  const layoutKey =
    seccion.layout_key ||
    inferLayoutKeyFromAsientos(asientosActuales);

  const plantilla = layoutKey ? ESTRUCTURA_TEATRO[layoutKey] : null;
  if (!plantilla) {
    throw new Error(
      'No se puede restaurar: esta sección no corresponde a Platea, Palco 1, Palco 2 ni Palco 3.'
    );
  }

  const transaction = await sequelize.transaction();

  try {
    const asientoIds = asientosActuales.map((a) => a.id);
    const ventas = asientoIds.length
      ? await Venta.findAll({
          where: { asiento_id: asientoIds },
          attributes: ['asiento_id'],
          transaction,
        })
      : [];
    const vendidosIds = [...new Set(ventas.map((v) => v.asiento_id))];

    if (vendidosIds.length) {
      await Asiento.destroy({
        where: {
          seccion_id: seccion.id,
          id: { [Op.notIn]: vendidosIds },
        },
        transaction,
      });
    } else {
      await Asiento.destroy({
        where: { seccion_id: seccion.id },
        transaction,
      });
    }

    const restantes = await Asiento.findAll({
      where: { seccion_id: seccion.id },
      attributes: ['fila', 'numero'],
      transaction,
    });
    const existentes = new Set(restantes.map((a) => `${a.fila}-${a.numero}`));

    const originales = generarAsientos(seccion.id, plantilla.asientos).filter(
      (a) => !existentes.has(`${a.fila}-${a.numero}`)
    );
    if (originales.length) {
      await bulkInsertAsientos(originales, transaction);
    }

    const capacidad = calcularCapacidad(plantilla.asientos);

    await seccion.update(
      {
        nombre: plantilla.nombre,
        precio: plantilla.precio,
        color: plantilla.color,
        layout_key: layoutKey,
        capacidad,
        activo: true,
      },
      { transaction }
    );

    await transaction.commit();

    await seccion.reload();
    return {
      seccion,
      asientos_creados: originales.length,
      ventas_conservadas: vendidosIds.length,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  inicializarTeatro,
  restaurarSeccion,
  ESTRUCTURA_TEATRO,
  calcularCapacidad,
};

if (require.main === module) {
  const eventoId = process.argv[2] || 1;
  inicializarTeatro(eventoId)
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch(() => process.exit(1));
}
