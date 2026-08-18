const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Seccion = sequelize.define('Seccion', {
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
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#3B82F6'
  },
  capacidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'secciones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Seccion;
