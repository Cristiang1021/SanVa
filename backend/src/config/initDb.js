const { sequelize, useTurso } = require('./database');
const { Op } = require('sequelize');
const { Usuario, ConfiguracionSmtp, Evento } = require('../models');
const { parseImagenBase64 } = require('../utils/imagen');
const crypto = require('crypto');

const TABLAS_APP = [
  'ventas',
  'asientos',
  'funciones',
  'secciones',
  'eventos',
  'configuracion_smtp',
  'usuarios',
];

const COLUMNAS_USUARIO = [
  'nombre_completo',
  'activo',
  'intentos_fallidos',
  'email_verificado',
  'created_at',
  'updated_at',
];

const dropTablasApp = async () => {
  await sequelize.query('PRAGMA foreign_keys = OFF');
  for (const tabla of TABLAS_APP) {
    await sequelize.query(`DROP TABLE IF EXISTS "${tabla}"`);
  }
  await sequelize.query('PRAGMA foreign_keys = ON');
  console.log('✓ Tablas de app eliminadas (reset esquema Turso)');
};

const esquemaUsuariosIncompleto = async () => {
  const [tablas] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'"
  );
  if (!tablas.length) return false;

  const [columnas] = await sequelize.query('PRAGMA table_info(usuarios)');
  const nombres = columnas.map((c) => c.name);
  return COLUMNAS_USUARIO.some((col) => !nombres.includes(col));
};

const repararEsquemaTurso = async () => {
  if (!useTurso) return;

  let superadmin = null;

  try {
    superadmin = await Usuario.findByPk(1);
  } catch {
    // Tabla ausente o esquema roto
  }

  if (superadmin) return;

  const incompleto = await esquemaUsuariosIncompleto();
  if (incompleto) {
    console.log('⚠ Esquema usuarios incompleto — recreando tablas...');
    await dropTablasApp();
  }
};

const migrarEsquemaEventosImagen = async () => {
  const [tablas] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='eventos'"
  );
  if (!tablas.length) return;

  const [columnas] = await sequelize.query('PRAGMA table_info(eventos)');
  const nombres = columnas.map((c) => c.name);

  if (!nombres.includes('imagen_data')) {
    await sequelize.query('ALTER TABLE eventos ADD COLUMN imagen_data BLOB');
    console.log('✓ Columna eventos.imagen_data (BLOB) añadida');
  }
  if (!nombres.includes('imagen_mime')) {
    await sequelize.query('ALTER TABLE eventos ADD COLUMN imagen_mime VARCHAR(50)');
    console.log('✓ Columna eventos.imagen_mime añadida');
  }

  const legacy = await Evento.unscoped().findAll({
    where: {
      imagen_mime: null,
      imagen_url: { [Op.like]: 'data:%' },
    },
    attributes: ['id', 'imagen_url', 'imagen_mime', 'imagen_data'],
  });

  for (const evento of legacy) {
    if (!evento.imagen_url?.startsWith('data:')) continue;
    try {
      const { buffer, mime } = parseImagenBase64(evento.imagen_url);
      await evento.update({
        imagen_data: buffer,
        imagen_mime: mime,
        imagen_url: null,
      });
      console.log(`✓ Imagen del evento ${evento.id} migrada a BLOB`);
    } catch (err) {
      console.warn(`⚠ No se pudo migrar imagen del evento ${evento.id}:`, err.message);
    }
  }
};

const inicializarDB = async () => {
  try {
    console.log('Inicializando base de datos...');

    // Turso ya inicializado manualmente o en deploy anterior
    if (useTurso) {
      try {
        const yaListo = await Usuario.findByPk(1);
        if (yaListo) {
          await migrarEsquemaEventosImagen();
          console.log('✓ Turso ya inicializado (superadmin id:1)');
          return;
        }
      } catch {
        // Tabla ausente — continuar con init completa
      }
    }

    await repararEsquemaTurso();
    await sequelize.sync();
    await migrarEsquemaEventosImagen();

    if (!useTurso) {
      await Usuario.sync({ alter: true });
      await Evento.sync({ alter: true });
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
          'SUPERADMIN_PASSWORD es obligatorio en producción. Añádela en Vercel → Environment Variables.'
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
    console.error('✗ Error al inicializar base de datos:', error.message);
    throw error;
  }
};

module.exports = inicializarDB;
