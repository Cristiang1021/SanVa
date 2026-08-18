const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Usuario } = require('../models');
const { authMiddleware, requireAdmin, bloquearSuperUsuario, bloquearEdicionSuperUsuario } = require('../middleware/auth');
const { sanitizeBody, authLimiter } = require('../middleware/security');
const emailService = require('../services/emailService');
const passwordService = require('../services/passwordService');
const { Op } = require('sequelize');

const router = express.Router();

// Rate limiter para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por IP
  message: 'Demasiados intentos de login. Intenta más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => false
});

// Login con bloqueo por intentos fallidos
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const usuario = await Usuario.findOne({ where: { username } });

    // Verificar si cuenta está bloqueada
    if (usuario && usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      const minutosFaltantes = Math.ceil((usuario.bloqueado_hasta - new Date()) / 60000);
      return res.status(403).json({
        error: `Cuenta bloqueada. Intenta en ${minutosFaltantes} minutos.`,
        bloqueado_hasta: usuario.bloqueado_hasta
      });
    }

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isValid = await usuario.validatePassword(password);

    if (!isValid) {
      // Incrementar intentos fallidos
      usuario.intentos_fallidos = (usuario.intentos_fallidos || 0) + 1;

      // Bloquear después de 5 intentos fallidos por 30 minutos
      if (usuario.intentos_fallidos >= 5) {
        const bloqueadoHasta = new Date(Date.now() + 30 * 60 * 1000);
        usuario.bloqueado_hasta = bloqueadoHasta;
        await usuario.save();

        return res.status(403).json({
          error: 'Cuenta bloqueada por demasiados intentos fallidos. Intenta en 30 minutos.',
          bloqueado_hasta: bloqueadoHasta
        });
      }

      await usuario.save();
      return res.status(401).json({
        error: 'Credenciales inválidas.',
        intentos_restantes: 5 - usuario.intentos_fallidos
      });
    }

    // Login exitoso - resetear intentos fallidos
    usuario.intentos_fallidos = 0;
    usuario.bloqueado_hasta = null;
    await usuario.save();

    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      usuario: usuario.toJSON()
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// Obtener usuario actual
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({ usuario: req.usuario });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario.' });
  }
});

// Cerrar sesión (client-side token removal)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Sesión cerrada correctamente.' });
});

// Cambiar contraseña con validación de fortaleza
router.post('/cambiar-password', authMiddleware, sanitizeBody, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Ambas contraseñas son requeridas.' });
    }

    // Validar fortaleza de nueva contraseña
    const validacion = passwordService.validarFortaleza(passwordNueva);
    if (!validacion.esValida) {
      return res.status(400).json({
        error: 'La contraseña no cumple los requisitos de seguridad.',
        requisitos_faltantes: validacion.faltantes,
        cumplidos: `${validacion.cumplidos}/${validacion.totalRequisitos}`
      });
    }

    const isValid = await req.usuario.validatePassword(passwordActual);

    if (!isValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta.' });
    }

    // Evitar reutilizar contraseña idéntica
    if (passwordService.esContraseniaReutilizada(passwordNueva, passwordActual)) {
      return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la anterior.' });
    }

    req.usuario.password_hash = passwordNueva;
    await req.usuario.save();

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña.' });
  }
});

// Solicitar recuperación de contraseña olvidada
router.post('/forgot-password', authLimiter, sanitizeBody, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email es requerido.' });
    }

    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      // Retornar mensaje genérico por seguridad (no revelar si email existe)
      return res.status(200).json({
        message: 'Si el email existe, recibirás un link de recuperación en tu bandeja.'
      });
    }

    // Generar token de recuperación válido por 15 minutos
    const token = passwordService.generarToken();
    const resetExpira = new Date(Date.now() + 15 * 60 * 1000);

    usuario.token_reset_password = token;
    usuario.reset_password_expira = resetExpira;
    await usuario.save();

    // Enviar email con link de recuperación
    const emailEnviado = await emailService.enviarRecuperacionPassword(
      email,
      usuario.nombre_completo,
      token,
      usuario.username
    );

    if (!emailEnviado) {
      console.warn('Email de recuperación no se envió, pero se guardó el token');
    }

    res.status(200).json({
      message: 'Si el email existe, recibirás un link de recuperación en tu bandeja.'
    });
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.status(500).json({ error: 'Error al solicitar recuperación de contraseña.' });
  }
});

// Verificar token de recuperación
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token es requerido.' });
    }

    const usuario = await Usuario.findOne({
      where: {
        token_reset_password: token,
        reset_password_expira: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Token inválido o expirado.' });
    }

    res.json({
      message: 'Token válido',
      email: usuario.email,
      username: usuario.username
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ error: 'Error al verificar token.' });
  }
});

// Resetear contraseña con token
router.post('/reset-password', authLimiter, sanitizeBody, async (req, res) => {
  try {
    const { token, passwordNueva } = req.body;

    if (!token || !passwordNueva) {
      return res.status(400).json({ error: 'Token y contraseña nueva son requeridos.' });
    }

    // Validar fortaleza de nueva contraseña
    const validacion = passwordService.validarFortaleza(passwordNueva);
    if (!validacion.esValida) {
      return res.status(400).json({
        error: 'La contraseña no cumple los requisitos de seguridad.',
        requisitos_faltantes: validacion.faltantes,
        cumplidos: `${validacion.cumplidos}/${validacion.totalRequisitos}`
      });
    }

    const usuario = await Usuario.findOne({
      where: {
        token_reset_password: token,
        reset_password_expira: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Token inválido o expirado.' });
    }

    // Actualizar contraseña
    usuario.password_hash = passwordNueva;
    usuario.token_reset_password = null;
    usuario.reset_password_expira = null;
    usuario.invitacion_pendiente = false;
    usuario.email_verificado = true;
    usuario.intentos_fallidos = 0;
    usuario.bloqueado_hasta = null;
    await usuario.save();

    res.json({ message: 'Contraseña restablecida correctamente. Por favor, inicia sesión.' });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ error: 'Error al resetear contraseña.' });
  }
});

module.exports = router;
