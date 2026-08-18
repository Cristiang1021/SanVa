const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const {
  authMiddleware,
  requireAdmin,
  requireSuperAdmin,
  bloquearEdicionSuperUsuario,
} = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/security');
const emailService = require('../services/emailService');
const passwordService = require('../services/passwordService');
const { SUPER_USER_ID } = require('../constants');

const router = express.Router();

const filtroListado = (extra = {}) => ({
  ...extra,
  id: { [Op.ne]: SUPER_USER_ID },
});

const crearInvitacion = async (usuario) => {
  const token = passwordService.generarToken();
  usuario.token_reset_password = token;
  usuario.reset_password_expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  usuario.invitacion_pendiente = true;
  await usuario.save();
  return token;
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rol } = req.query;

    if (rol === 'admin') {
      if (req.usuario.rol !== 'superadmin') {
        return res.status(403).json({ error: 'Solo el superadministrador puede listar administradores.' });
      }
    } else if (!['admin', 'superadmin'].includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const where = filtroListado();
    if (rol) where.rol = rol;

    const usuarios = await Usuario.findAll({
      where,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash', 'token_verificacion_email', 'token_reset_password'] },
    });

    res.json({ usuarios });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios.' });
  }
});

router.post('/', authMiddleware, requireAdmin, sanitizeBody, async (req, res) => {
  try {
    const { username, email, password, nombre_completo } = req.body;

    if (!username || !email || !password || !nombre_completo) {
      return res.status(400).json({
        error: 'username, email, password y nombre_completo son requeridos.',
      });
    }

    const validacion = passwordService.validarFortaleza(password);
    if (!validacion.esValida) {
      return res.status(400).json({
        error: 'La contraseña no cumple los requisitos de seguridad.',
        requisitos_faltantes: validacion.faltantes,
      });
    }

    const existente = await Usuario.findOne({ where: { username } });
    if (existente) {
      return res.status(400).json({ error: 'El username ya está en uso.' });
    }

    const emailExistente = await Usuario.findOne({ where: { email } });
    if (emailExistente) {
      return res.status(400).json({ error: 'El email ya está en uso.' });
    }

    const usuario = await Usuario.create({
      username,
      email,
      password_hash: password,
      rol: 'vendedor',
      nombre_completo,
      email_verificado: true,
      activo: true,
      invitacion_pendiente: false,
    });

    res.status(201).json({
      message: 'Vendedor creado correctamente',
      usuario,
    });
  } catch (error) {
    console.error('Error al crear vendedor:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Datos inválidos.' });
    }
    res.status(500).json({ error: 'Error al crear vendedor.' });
  }
});

router.post('/admin', authMiddleware, requireSuperAdmin, sanitizeBody, async (req, res) => {
  try {
    const { username, email, password, nombre_completo } = req.body;

    if (!username || !email || !password || !nombre_completo) {
      return res.status(400).json({
        error: 'username, email, password y nombre_completo son requeridos.',
      });
    }

    const validacion = passwordService.validarFortaleza(password);
    if (!validacion.esValida) {
      return res.status(400).json({
        error: 'La contraseña no cumple los requisitos de seguridad.',
        requisitos_faltantes: validacion.faltantes,
      });
    }

    const existente = await Usuario.findOne({ where: { username } });
    if (existente) {
      return res.status(400).json({ error: 'El username ya está en uso.' });
    }

    const emailExistente = await Usuario.findOne({ where: { email } });
    if (emailExistente) {
      return res.status(400).json({ error: 'El email ya está en uso.' });
    }

    const usuario = await Usuario.create({
      username,
      email,
      password_hash: password,
      rol: 'admin',
      nombre_completo,
      email_verificado: true,
      activo: true,
      invitacion_pendiente: false,
    });

    res.status(201).json({
      message: 'Administrador creado correctamente',
      usuario,
    });
  } catch (error) {
    console.error('Error al crear administrador:', error);
    res.status(500).json({ error: 'Error al crear administrador.' });
  }
});

router.post('/invitar', authMiddleware, requireAdmin, sanitizeBody, async (req, res) => {
  try {
    const { username, email, nombre_completo } = req.body;

    if (!username || !email || !nombre_completo) {
      return res.status(400).json({
        error: 'username, email y nombre_completo son requeridos.',
      });
    }

    const existente = await Usuario.findOne({ where: { username } });
    if (existente) {
      return res.status(400).json({ error: 'El username ya está en uso.' });
    }

    const emailExistente = await Usuario.findOne({ where: { email } });
    if (emailExistente) {
      return res.status(400).json({ error: 'El email ya está en uso.' });
    }

    const passwordTemporal = crypto.randomBytes(32).toString('hex');

    const usuario = await Usuario.create({
      username,
      email,
      nombre_completo,
      password_hash: passwordTemporal,
      rol: 'vendedor',
      activo: true,
      email_verificado: false,
      invitacion_pendiente: true,
      token_reset_password: passwordService.generarToken(),
      reset_password_expira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const token = usuario.token_reset_password;

    const enviado = await emailService.enviarInvitacionVendedor(
      email,
      nombre_completo,
      token,
      username
    );

    if (!enviado) {
      return res.status(400).json({
        error: 'Vendedor creado, pero no se pudo enviar el correo. Configura Gmail en Configuraciones.',
      });
    }

    res.status(201).json({
      message: `Invitación enviada a ${email}.`,
      usuario,
    });
  } catch (error) {
    console.error('Error al invitar vendedor:', error);
    res.status(500).json({ error: 'Error al enviar invitación.' });
  }
});

router.post('/admin/invitar', authMiddleware, requireSuperAdmin, sanitizeBody, async (req, res) => {
  try {
    const { username, email, nombre_completo } = req.body;

    if (!username || !email || !nombre_completo) {
      return res.status(400).json({
        error: 'username, email y nombre_completo son requeridos.',
      });
    }

    const existente = await Usuario.findOne({ where: { username } });
    if (existente) {
      return res.status(400).json({ error: 'El username ya está en uso.' });
    }

    const emailExistente = await Usuario.findOne({ where: { email } });
    if (emailExistente) {
      return res.status(400).json({ error: 'El email ya está en uso.' });
    }

    const passwordTemporal = crypto.randomBytes(32).toString('hex');

    const usuario = await Usuario.create({
      username,
      email,
      nombre_completo,
      password_hash: passwordTemporal,
      rol: 'admin',
      activo: true,
      email_verificado: false,
      invitacion_pendiente: true,
      token_reset_password: passwordService.generarToken(),
      reset_password_expira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const enviado = await emailService.enviarInvitacionAdmin(
      email,
      nombre_completo,
      usuario.token_reset_password,
      username
    );

    if (!enviado) {
      return res.status(400).json({
        error: 'Administrador creado, pero no se pudo enviar el correo. Configura Gmail en Configuraciones.',
      });
    }

    res.status(201).json({
      message: `Invitación de administrador enviada a ${email}.`,
      usuario,
    });
  } catch (error) {
    console.error('Error al invitar administrador:', error);
    res.status(500).json({ error: 'Error al enviar invitación.' });
  }
});

router.post('/:id/reenviar-invitacion', authMiddleware, requireAdmin, bloquearEdicionSuperUsuario, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario || !['vendedor', 'admin'].includes(usuario.rol)) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (usuario.rol === 'admin' && req.usuario.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Solo el superadministrador puede reenviar invitaciones de admin.' });
    }

    const token = await crearInvitacion(usuario);

    const enviado = usuario.rol === 'admin'
      ? await emailService.enviarInvitacionAdmin(usuario.email, usuario.nombre_completo, token, usuario.username)
      : await emailService.enviarInvitacionVendedor(usuario.email, usuario.nombre_completo, token, usuario.username);

    if (!enviado) {
      return res.status(400).json({ error: 'No se pudo reenviar la invitación.' });
    }

    res.json({ message: 'Invitación reenviada correctamente.' });
  } catch (error) {
    console.error('Error al reenviar invitación:', error);
    res.status(500).json({ error: 'Error al reenviar invitación.' });
  }
});

router.put('/:id', authMiddleware, requireAdmin, bloquearEdicionSuperUsuario, sanitizeBody, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario || usuario.id === SUPER_USER_ID) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (usuario.rol === 'admin' && req.usuario.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Solo el superadministrador puede editar administradores.' });
    }

    if (usuario.rol === 'superadmin') {
      return res.status(403).json({ error: 'No se puede editar un superadministrador.' });
    }

    const { nombre_completo, email, activo, password } = req.body;
    const updates = {};

    if (nombre_completo !== undefined) updates.nombre_completo = nombre_completo;
    if (email !== undefined) updates.email = email;
    if (activo !== undefined) updates.activo = activo;
    if (password) {
      const validacion = passwordService.validarFortaleza(password);
      if (!validacion.esValida) {
        return res.status(400).json({
          error: 'La contraseña no cumple los requisitos de seguridad.',
          requisitos_faltantes: validacion.faltantes,
        });
      }
      updates.password_hash = password;
      updates.invitacion_pendiente = false;
    }

    await usuario.update(updates);

    const etiqueta = usuario.rol === 'admin' ? 'Administrador' : 'Vendedor';
    res.json({ message: `${etiqueta} actualizado correctamente`, usuario });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

router.delete('/:id', authMiddleware, requireAdmin, bloquearEdicionSuperUsuario, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario || usuario.id === SUPER_USER_ID) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (usuario.rol === 'admin' && req.usuario.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Solo el superadministrador puede desactivar administradores.' });
    }

    if (usuario.rol === 'superadmin') {
      return res.status(403).json({ error: 'No se puede desactivar un superadministrador.' });
    }

    await usuario.update({ activo: false });

    const etiqueta = usuario.rol === 'admin' ? 'Administrador' : 'Vendedor';
    res.json({ message: `${etiqueta} desactivado correctamente` });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({ error: 'Error al desactivar usuario.' });
  }
});

module.exports = router;
