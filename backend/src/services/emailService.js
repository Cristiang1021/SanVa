const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { construirConfirmacionCompra } = require('../templates/confirmacionCompra');
const { construirEmailAcceso } = require('../templates/emailAcceso');
const { decrypt } = require('../utils/crypto');
const { escapeHtml } = require('../utils/security');

dotenv.config();

const GMAIL_HOST = 'smtp.gmail.com';
const GMAIL_PORT = 587;

let transporterCache = null;
let transporterCacheKey = null;

const obtenerModeloConfig = () => {
  try {
    return require('../models').ConfiguracionSmtp;
  } catch {
    return null;
  }
};

const credencialesDesdeEnv = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass || pass === 'your_app_password_here' || pass === 'app_password_here') {
    return null;
  }
  return {
    smtp_email: user,
    smtp_password: pass,
    from_nombre: 'SanVa Teatro',
    host: GMAIL_HOST,
    port: GMAIL_PORT
  };
};

const obtenerCredenciales = async () => {
  const ConfiguracionSmtp = obtenerModeloConfig();
  if (ConfiguracionSmtp) {
    const config = await ConfiguracionSmtp.findByPk(1);
    if (config?.smtp_email && config.smtp_password) {
      const password = decrypt(config.smtp_password);
      if (password) {
        return {
          smtp_email: config.smtp_email,
          smtp_password: password,
          from_nombre: config.from_nombre || 'SanVa Teatro',
          host: config.host || GMAIL_HOST,
          port: config.port || GMAIL_PORT
        };
      }
    }
  }
  return credencialesDesdeEnv();
};

const crearTransporter = (credenciales) =>
  nodemailer.createTransport({
    host: credenciales.host || GMAIL_HOST,
    port: Number(credenciales.port) || GMAIL_PORT,
    secure: Number(credenciales.port) === 465,
    auth: {
      user: credenciales.smtp_email,
      pass: String(credenciales.smtp_password).replace(/\s/g, '')
    }
  });

const getTransporter = async () => {
  const credenciales = await obtenerCredenciales();
  if (!credenciales) return null;

  const cacheKey = `${credenciales.smtp_email}:${credenciales.smtp_password}:${credenciales.host}:${credenciales.port}`;
  if (transporterCache && transporterCacheKey === cacheKey) {
    return { transporter: transporterCache, credenciales };
  }

  transporterCache = crearTransporter(credenciales);
  transporterCacheKey = cacheKey;
  return { transporter: transporterCache, credenciales };
};

const formatoFrom = (credenciales) => {
  const nombre = credenciales.from_nombre || 'SanVa Teatro';
  return `"${nombre}" <${credenciales.smtp_email}>`;
};

const emailService = {
  invalidarTransporter: () => {
    transporterCache = null;
    transporterCacheKey = null;
  },

  enviarRecuperacionPassword: async (email, nombre, token, usuario) => {
    try {
      const sesion = await getTransporter();
      if (!sesion) {
        console.warn('⚠ SMTP no configurado: no se envió el email de recuperación');
        return false;
      }

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      const plantilla = construirEmailAcceso({
        titulo: 'RECUPERAR CONTRASEÑA',
        saludo: nombre,
        mensaje: `Recibimos una solicitud para restablecer la contraseña de tu cuenta${usuario ? ` (${usuario})` : ''}. El enlace es válido por 15 minutos.`,
        botonTexto: 'Restablecer contraseña',
        botonUrl: resetLink,
        aviso: 'Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.'
      });

      await sesion.transporter.sendMail({
        from: formatoFrom(sesion.credenciales),
        to: email,
        subject: 'Recuperar contraseña - Sanva Shows',
        html: plantilla.html,
        attachments: plantilla.attachments
      });

      console.log(`✓ Email de recuperación enviado a ${email}`);
      return true;
    } catch (error) {
      console.error('Error al enviar email de recuperación:', error);
      return false;
    }
  },

  enviarInvitacionVendedor: async (email, nombre, token, username) => {
    try {
      const sesion = await getTransporter();
      if (!sesion) {
        console.warn('⚠ SMTP no configurado: no se envió la invitación');
        return false;
      }

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const activarLink = `${frontendUrl}/reset-password?token=${token}`;

      const plantilla = construirEmailAcceso({
        titulo: 'INVITACIÓN AL SISTEMA',
        saludo: nombre,
        mensaje: `Fuiste invitado a vender boletos en Sanva Shows. Tu usuario es "${username}". Crea tu contraseña con el botón (válido 7 días).`,
        botonTexto: 'Activar mi cuenta',
        botonUrl: activarLink,
        aviso: 'Si no esperabas esta invitación, puedes ignorar este correo.'
      });

      await sesion.transporter.sendMail({
        from: formatoFrom(sesion.credenciales),
        to: email,
        subject: 'Invitación - Sanva Shows',
        html: plantilla.html,
        attachments: plantilla.attachments
      });

      console.log(`✓ Invitación enviada a ${email}`);
      return true;
    } catch (error) {
      console.error('Error al enviar invitación:', error);
      return false;
    }
  },

  enviarInvitacionAdmin: async (email, nombre, token, username) => {
    try {
      const sesion = await getTransporter();
      if (!sesion) {
        console.warn('⚠ SMTP no configurado: no se envió la invitación');
        return false;
      }

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const activarLink = `${frontendUrl}/reset-password?token=${token}`;

      const plantilla = construirEmailAcceso({
        titulo: 'INVITACIÓN ADMINISTRADOR',
        saludo: nombre,
        mensaje: `Fuiste invitado como administrador en Sanva Shows. Tu usuario es "${username}". Crea tu contraseña con el botón (válido 7 días).`,
        botonTexto: 'Activar mi cuenta',
        botonUrl: activarLink,
        aviso: 'Si no esperabas esta invitación, puedes ignorar este correo.',
      });

      await sesion.transporter.sendMail({
        from: formatoFrom(sesion.credenciales),
        to: email,
        subject: 'Invitación administrador - Sanva Shows',
        html: plantilla.html,
        attachments: plantilla.attachments,
      });

      console.log(`✓ Invitación admin enviada a ${email}`);
      return true;
    } catch (error) {
      console.error('Error al enviar invitación admin:', error);
      return false;
    }
  },

  enviarConfirmacionCompra: async (email, cliente, datos) => {
    try {
      const sesion = await getTransporter();
      if (!sesion) {
        console.warn('⚠ SMTP no configurado: no se envió la confirmación de compra');
        return false;
      }

      const ConfiguracionSmtp = obtenerModeloConfig();
      const config = ConfiguracionSmtp ? await ConfiguracionSmtp.findByPk(1) : null;
      const plantilla = construirConfirmacionCompra({
        cliente,
        email,
        datos,
        config: config ? config.toJSON() : {}
      });

      await sesion.transporter.sendMail({
        from: formatoFrom(sesion.credenciales),
        to: email,
        subject: `Confirmación de compra - ${datos.evento || 'SanVa Teatro'}`,
        html: plantilla.html,
        attachments: plantilla.attachments
      });

      console.log(`✓ Email de confirmación enviado a ${email}`);
      return true;
    } catch (error) {
      console.error('Error al enviar email de confirmación:', error);
      return false;
    }
  },

  enviarVerificacionEmail: async (email, nombre, token) => {
    try {
      const sesion = await getTransporter();
      if (!sesion) {
        console.warn('⚠ SMTP no configurado: no se envió el email de verificación');
        return false;
      }

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

      const htmlContent = `
        <h2>Verificación de Email - SanVa Teatro</h2>
        <p>Hola ${nombre},</p>
        <p>Por favor verifica tu email haciendo clic en el siguiente enlace:</p>
        <p><a href="${verifyLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verificar Email</a></p>
        <p>O copia este enlace en tu navegador:</p>
        <p>${verifyLink}</p>
        <p>Saludos,<br>Equipo SanVa</p>
      `;

      await sesion.transporter.sendMail({
        from: formatoFrom(sesion.credenciales),
        to: email,
        subject: 'Verificación de Email - SanVa Teatro',
        html: htmlContent
      });

      console.log(`✓ Email de verificación enviado a ${email}`);
      return true;
    } catch (error) {
      console.error('Error al enviar email de verificación:', error);
      return false;
    }
  }
};

module.exports = emailService;
