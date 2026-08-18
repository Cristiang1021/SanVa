const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Asiento = sequelize.define('Asiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  seccion_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'secciones',
      key: 'id'
    }
  },
  fila: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  posicion_x: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  posicion_y: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  estado: {
    type: DataTypes.ENUM('disponible', 'bloqueado', 'vendido', 'reservado'),
    defaultValue: 'disponible'
  },
  reservado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reservado_hasta: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'asientos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Asiento;
