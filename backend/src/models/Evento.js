const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Evento = sequelize.define('Evento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imagen_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  imagen_mime: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  imagen_data: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  },
  fecha_unica: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  hora_unica: {
    type: DataTypes.STRING(5),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'eventos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  defaultScope: {
    attributes: { exclude: ['imagen_data'] },
  },
  scopes: {
    conImagen: {
      attributes: { include: ['imagen_data'] },
    },
  },
});

module.exports = Evento;
