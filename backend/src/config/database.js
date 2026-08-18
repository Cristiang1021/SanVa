const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;
const useTurso = Boolean(tursoUrl && tursoToken);

let sequelize;

if (useTurso) {
  // Sequelize intenta mkdir(dirname(storage)); sin OPEN_CREATE no lo hace
  // y @libsql/sqlite3 acepta la URL remota en el constructor.
  const libsql = require('@libsql/sqlite3');
  const separator = tursoUrl.includes('?') ? '&' : '?';
  const storage = `${tursoUrl}${separator}authToken=${encodeURIComponent(tursoToken)}`;

  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: libsql,
    storage,
    dialectOptions: {
      mode: libsql.OPEN_READWRITE,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

module.exports = { sequelize, useTurso };
