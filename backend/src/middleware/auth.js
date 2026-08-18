const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { isSuperUsuario } = require('../utils/security');
const { SUPER_USER_ID } = require('../constants');

const esPanelAdmin = (usuario) => ['admin', 'superadmin'].includes(usuario?.rol);
const esSuperAdmin = (usuario) => usuario?.rol === 'superadmin' || usuario?.id === SUPER_USER_ID;

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado. Token requerido.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
    }

    req.usuario = usuario;
    req.esSuperUsuario = isSuperUsuario(usuario);
    req.esSuperAdmin = esSuperAdmin(usuario);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado.' });
    }
    return res.status(500).json({ error: 'Error de autenticación.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!esPanelAdmin(req.usuario)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!esSuperAdmin(req.usuario)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere superadministrador.' });
  }
  next();
};

const requireVendedor = (req, res, next) => {
  if (!['admin', 'superadmin', 'vendedor'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
};

const bloquearSuperUsuario = (req, res, next) => {
  if (isSuperUsuario(req.usuario)) {
    return res.status(403).json({ error: 'Esta acción no está permitida en la cuenta principal.' });
  }
  next();
};

const bloquearEdicionSuperUsuario = (req, res, next) => {
  if (Number(req.params.id) === SUPER_USER_ID) {
    return res.status(403).json({ error: 'No se puede modificar la cuenta principal del sistema.' });
  }
  next();
};

module.exports = {
  authMiddleware,
  requireAdmin,
  requireSuperAdmin,
  requireVendedor,
  bloquearSuperUsuario,
  bloquearEdicionSuperUsuario,
  esPanelAdmin,
  esSuperAdmin,
};
