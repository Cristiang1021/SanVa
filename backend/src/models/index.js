const { sequelize } = require('../config/database');
const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');
const Seccion = require('../models/Seccion');
const Asiento = require('../models/Asiento');
const Funcion = require('../models/Funcion');
const Venta = require('../models/Venta');
const ConfiguracionSmtp = require('../models/ConfiguracionSmtp');

// Definir relaciones
Evento.hasMany(Seccion, { foreignKey: 'evento_id', as: 'secciones' });
Seccion.belongsTo(Evento, { foreignKey: 'evento_id', as: 'evento' });

Seccion.hasMany(Asiento, { foreignKey: 'seccion_id', as: 'asientos' });
Asiento.belongsTo(Seccion, { foreignKey: 'seccion_id', as: 'seccion' });

Evento.hasMany(Funcion, { foreignKey: 'evento_id', as: 'funciones' });
Funcion.belongsTo(Evento, { foreignKey: 'evento_id', as: 'evento' });

Funcion.hasMany(Venta, { foreignKey: 'funcion_id', as: 'ventas' });
Venta.belongsTo(Funcion, { foreignKey: 'funcion_id', as: 'funcion' });

Asiento.hasMany(Venta, { foreignKey: 'asiento_id', as: 'ventas' });
Venta.belongsTo(Asiento, { foreignKey: 'asiento_id', as: 'asiento' });

Usuario.hasMany(Venta, { foreignKey: 'usuario_id', as: 'ventas' });
Venta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'vendedor' });

// Sincronizar modelos
const syncModels = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados correctamente');
  } catch (error) {
    console.error('Error al sincronizar modelos:', error);
  }
};

module.exports = {
  sequelize,
  Usuario,
  Evento,
  Seccion,
  Asiento,
  Funcion,
  Venta,
  ConfiguracionSmtp,
  syncModels
};
