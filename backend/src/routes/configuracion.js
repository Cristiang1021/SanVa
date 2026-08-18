const express = require('express');
const nodemailer = require('nodemailer');
const { ConfiguracionSmtp } = require('../models');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');
const emailService = require('../services/emailService');

const router = express.Router();

const GMAIL_HOST = 'smtp.gmail.com';
const GMAIL_PORT = 587;

const obtenerOCrear = async () => {
  const [config] = await ConfiguracionSmtp.findOrCreate({
    where: { id: 1 },
    defaults: {
      id: 1,
      host: GMAIL_HOST,
      port: GMAIL_PORT,
      from_nombre: 'SanVa Teatro',
      activo: false
    }
  });
  return config;
};

const serializar = (config) => ({
  smtp_email: config.smtp_email || '',
  from_nombre: config.from_nombre || 'SanVa Teatro',
  host: config.host || GMAIL_HOST,
  port: config.port || GMAIL_PORT,
  activo: Boolean(config.activo && config.smtp_email && config.smtp_password),
  tiene_password: Boolean(config.smtp_password),
  contacto_email: config.contacto_email || '',
  contacto_telefono: config.contacto_telefono || '',
  instagram: config.instagram || '',
  facebook: config.facebook || '',
  tiktok: config.tiktok || '',
  youtube: config.youtube || '',
  twitter: config.twitter || ''
});

const construirTransporter = ({ smtp_email, smtp_password, host, port }) =>
  nodemailer.createTransport({
    host: host || GMAIL_HOST,
    port: Number(port) || GMAIL_PORT,
    secure: Number(port) === 465,
    auth: {
      user: smtp_email,
      pass: smtp_password.replace(/\s/g, '')
    }
  });

router.get('/smtp', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const config = await obtenerOCrear();
    res.json(serializar(config));
  } catch (error) {
    console.error('Error al obtener SMTP:', error);
    res.status(500).json({ error: 'Error al obtener la configuración de correo.' });
  }
});

router.put('/smtp', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const {
      smtp_email,
      smtp_password,
      from_nombre,
      contacto_email,
      contacto_telefono,
      instagram,
      facebook,
      tiktok,
      youtube,
      twitter
    } = req.body;
    const config = await obtenerOCrear();

    if (!smtp_email || !smtp_email.includes('@')) {
      return res.status(400).json({ error: 'Ingresa un correo de Gmail válido.' });
    }

    const passwordLimpia = smtp_password ? String(smtp_password).replace(/\s/g, '') : '';
    if (!config.smtp_password && !passwordLimpia) {
      return res.status(400).json({ error: 'La contraseña de aplicación de Gmail es requerida.' });
    }

    config.smtp_email = smtp_email.trim();
    config.from_nombre = (from_nombre || 'SanVa Teatro').trim();
    config.host = GMAIL_HOST;
    config.port = GMAIL_PORT;
    config.contacto_email = String(contacto_email || '').trim() || null;
    config.contacto_telefono = String(contacto_telefono || '').trim() || null;
    config.instagram = String(instagram || '').trim() || null;
    config.facebook = String(facebook || '').trim() || null;
    config.tiktok = String(tiktok || '').trim() || null;
    config.youtube = String(youtube || '').trim() || null;
    config.twitter = String(twitter || '').trim() || null;

    if (passwordLimpia) {
      config.smtp_password = encrypt(passwordLimpia);
    }

    config.activo = Boolean(config.smtp_email && config.smtp_password);
    await config.save();
    emailService.invalidarTransporter();

    res.json({
      message: 'Configuración de Gmail guardada.',
      ...serializar(config)
    });
  } catch (error) {
    console.error('Error al guardar SMTP:', error);
    res.status(500).json({ error: 'Error al guardar la configuración de correo.' });
  }
});

router.post('/smtp/probar', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Ingresa un correo de destino para la prueba.' });
    }

    const config = await obtenerOCrear();
    const password = decrypt(config.smtp_password);

    if (!config.smtp_email || !password) {
      return res.status(400).json({
        error: 'Guarda primero el correo y la contraseña de aplicación de Gmail.'
      });
    }

    const transporter = construirTransporter({
      smtp_email: config.smtp_email,
      smtp_password: password,
      host: config.host,
      port: config.port
    });

    await transporter.verify();

    const fechaEjemplo = new Date();
    fechaEjemplo.setDate(fechaEjemplo.getDate() + ((6 - fechaEjemplo.getDay() + 7) % 7 || 7));
    fechaEjemplo.setHours(20, 0, 0, 0);

    const enviado = await emailService.enviarConfirmacionCompra(email, 'María Pérez', {
      evento: 'Noche de teatro — función de prueba',
      funcion: fechaEjemplo,
      lugar: 'Teatro San Valentin',
      asientos: 'Platea A12, Platea A13, Palco B4',
      telefono: '099 123 4567',
      precio: 45,
      metodo_pago: 'tarjeta',
      referencia_pago: null
    });

    if (!enviado) {
      return res.status(400).json({
        error: 'La conexión funciona, pero no se pudo enviar la plantilla. Revisa el logo y los adjuntos.'
      });
    }

    res.json({ message: `Se envió una confirmación de ejemplo a ${email}.` });
  } catch (error) {
    console.error('Error al probar SMTP:', error);
    const detalle = error.response || error.message || 'No se pudo enviar el correo de prueba.';
    res.status(400).json({
      error: 'Gmail rechazó la conexión. Revisa el correo y la contraseña de aplicación.',
      detalle: String(detalle)
    });
  }
});

module.exports = router;
