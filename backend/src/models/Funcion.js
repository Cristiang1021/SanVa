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
  pausada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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

Funcion.prototype.estaFinalizada = function(ahora = Date.now()) {
  return new Date(this.fecha_hora).getTime() <= ahora;
};

Funcion.prototype.paraCalendario = function(ahora) {
  const finalizada = this.estaFinalizada(ahora);
  return { ...this.toJSON(), finalizada, activo: Boolean(this.activo) && !this.pausada && !finalizada };
};

module.exports = Funcion;
