const { sequelize, useTurso } = require('./database');
const { Usuario, ConfiguracionSmtp } = require('../models');
const crypto = require('crypto');

const inicializarDB = async () => {
  try {
    console.log('Inicializando base de datos...');

    await sequelize.sync();

    // ALTER TABLE no es fiable en Turso/libSQL remoto
    if (!useTurso) {
      await Usuario.sync({ alter: true });
      if (ConfiguracionSmtp) {
        await ConfiguracionSmtp.sync({ alter: true });
      }
    }
    console.log('✓ Modelos sincronizados');

    const superExistente = await Usuario.findByPk(1);

    if (!superExistente) {
      const password = process.env.SUPERADMIN_PASSWORD;
      const enProduccion = process.env.NODE_ENV === 'production';

      if (!password && enProduccion) {
        throw new Error(
          'SUPERADMIN_PASSWORD es obligatorio en producción. Define la variable en el entorno.'
        );
      }

      const passwordInicial = password || crypto.randomBytes(24).toString('hex');

      await Usuario.create({
        id: 1,
        username: process.env.SUPERADMIN_USERNAME || 'superadmin',
        email: process.env.SUPERADMIN_EMAIL || 'superadmin@sanva.local',
        password_hash: passwordInicial,
        rol: 'superadmin',
        nombre_completo: process.env.SUPERADMIN_NOMBRE || 'Super Administrador',
        email_verificado: true,
        activo: true,
      });

      if (!password) {
        console.warn(
          '⚠ SUPERADMIN_PASSWORD no definida. Se generó una contraseña temporal; cámbiala en Configuraciones.'
        );
      } else {
        console.log('✓ Superadmin creado (id:1). Usuario:', process.env.SUPERADMIN_USERNAME || 'superadmin');
      }
    } else if (superExistente.rol !== 'superadmin') {
      await superExistente.update({ rol: 'superadmin' });
      console.log('✓ Cuenta id:1 actualizada a superadmin');
    } else {
      console.log('✓ Base de datos ya inicializada');
    }

    console.log('✓ Inicialización completa');
  } catch (error) {
    console.error('✗ Error al inicializar base de datos:', error);
    throw error;
  }
};

module.exports = inicializarDB;
