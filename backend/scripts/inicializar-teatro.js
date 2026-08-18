const { Evento, Funcion, Seccion, Asiento } = require('../src/models');

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
      { fila: 'N', numeros: 15 }
    ]
  },
  palco1: {
    nombre: 'Palco 1',
    precio: 80,
    color: '#3B82F6',
    asientos: [
      { fila: 'P', prefijo: 'p', numeros: 65 }
    ]
  },
  palco2: {
    nombre: 'Palco 2',
    precio: 75,
    color: '#F59E0B',
    asientos: [
      { fila: 'V', prefijo: 'v', numeros: 60 }
    ]
  },
  palco3: {
    nombre: 'Palco 3',
    precio: 70,
    color: '#8B5CF6',
    asientos: [
      { fila: 'Z', prefijo: 'z', numeros: 57 }
    ]
  }
};

async function inicializarTeatro(eventoId) {
  try {
    console.log(`Inicializando teatro para evento ${eventoId}...`);

    for (const [key, seccionData] of Object.entries(ESTRUCTURA_TEATRO)) {
      // Crear sección
      const seccion = await Seccion.findOrCreate({
        where: { evento_id: eventoId, nombre: seccionData.nombre },
        defaults: {
          evento_id: eventoId,
          nombre: seccionData.nombre,
          precio: seccionData.precio,
          color: seccionData.color,
          capacidad: calcularCapacidad(seccionData.asientos),
          activo: true
        }
      });

      const seccionId = seccion[0].id;
      console.log(`✓ Sección creada: ${seccionData.nombre} (ID: ${seccionId})`);

      // Crear asientos
      let asientosCreados = 0;
      for (const config of seccionData.asientos) {
        for (let i = 1; i <= config.numeros; i++) {
          // Para palcos, usar el prefijo en la fila; para platea, usar la letra
          const filaFinal = config.prefijo ? config.prefijo : config.fila;

          await Asiento.findOrCreate({
            where: {
              seccion_id: seccionId,
              fila: filaFinal,
              numero: i
            },
            defaults: {
              seccion_id: seccionId,
              fila: filaFinal,
              numero: i,
              estado: 'disponible',
              posicion_x: 0,
              posicion_y: 0
            }
          });
          asientosCreados++;
        }
      }
      console.log(`  └─ ${asientosCreados} asientos generados`);
    }

    console.log('✅ Teatro inicializado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando teatro:', error.message);
    return false;
  }
}

function calcularCapacidad(asientos) {
  return asientos.reduce((sum, a) => sum + a.numeros, 0);
}

module.exports = { inicializarTeatro };

// Ejecutar si se llama directamente
if (require.main === module) {
  const eventoId = process.argv[2] || 1;
  inicializarTeatro(eventoId)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
