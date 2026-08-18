const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rol: {
    type: DataTypes.STRING(20),
    defaultValue: 'vendedor',
    validate: {
      isIn: [['superadmin', 'admin', 'vendedor']],
    },
  },
  nombre_completo: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  intentos_fallidos: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  bloqueado_hasta: {
    type: DataTypes.DATE,
    allowNull: true
  },
  email_verificado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  token_verificacion_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  token_reset_password: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reset_password_expira: {
    type: DataTypes.DATE,
    allowNull: true
  },
  invitacion_pendiente: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.password_hash) {
        usuario.password_hash = await bcrypt.hash(usuario.password_hash, 10);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('password_hash')) {
        usuario.password_hash = await bcrypt.hash(usuario.password_hash, 10);
      }
    }
  }
});

Usuario.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

Usuario.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

module.exports = Usuario;
