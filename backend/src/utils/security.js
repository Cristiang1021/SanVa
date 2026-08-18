const { SUPER_USER_ID } = require('../constants');

const escapeHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeString = (valor, maxLen = 500) => {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/[\0\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .slice(0, maxLen);
};

const sanitizeEmail = (valor) => sanitizeString(valor, 150).toLowerCase();

const sanitizeUsername = (valor) =>
  sanitizeString(valor, 50).replace(/[^a-zA-Z0-9._-]/g, '');

const isSuperUsuario = (usuario) => usuario?.id === SUPER_USER_ID;

const ocultarSuperUsuario = (where = {}) => ({
  ...where,
  id: { ...(where.id || {}), [require('sequelize').Op.ne]: SUPER_USER_ID }
});

module.exports = {
  escapeHtml,
  sanitizeString,
  sanitizeEmail,
  sanitizeUsername,
  isSuperUsuario,
  ocultarSuperUsuario,
  SUPER_USER_ID
};
