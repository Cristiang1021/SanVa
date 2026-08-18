const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConfiguracionSmtp = sequelize.define('ConfiguracionSmtp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  smtp_email: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  smtp_password: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  from_nombre: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'SanVa Teatro'
  },
  host: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: 'smtp.gmail.com'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 587
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  contacto_email: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  contacto_telefono: {
    type: DataTypes.STRING(40),
    allowNull: true
  },
  instagram: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  facebook: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  tiktok: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  youtube: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  twitter: {
    type: DataTypes.STRING(120),
    allowNull: true
  }
}, {
  tableName: 'configuracion_smtp',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ConfiguracionSmtp;
