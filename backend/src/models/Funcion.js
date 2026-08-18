const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Funcion = sequelize.define('Funcion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  evento_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'eventos',
      key: 'id'
    }
  },
  fecha_hora: {
    type: DataTypes.DATE,
    allowNull: false
  },
  lugar: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'funciones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Funcion;
