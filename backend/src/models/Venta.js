const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Venta = sequelize.define('Venta', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  funcion_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'funciones',
      key: 'id'
    }
  },
  asiento_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'asientos',
      key: 'id'
    }
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  cliente_nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  cliente_tel: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  cliente_email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  metodo_pago: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'efectivo'
  },
  referencia_pago: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'ventas',
  timestamps: true,
  createdAt: 'fecha_venta',
  updatedAt: false
});

module.exports = Venta;
