const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sanitizeString } = require('../utils/security');

const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  // Permite <img src="api/.../imagen"> desde el frontend (origen distinto en dev)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
  skip: (req) => req.path === '/health',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta más tarde.' }
});

const SKIP_SANITIZE = new Set([
  'imagen_base64',
  'password',
  'passwordActual',
  'passwordNueva',
  'password_hash',
]);

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string' && !SKIP_SANITIZE.has(key)) {
        req.body[key] = sanitizeString(value, 2000);
      }
    }
  }
  next();
};

module.exports = {
  helmetMiddleware,
  apiLimiter,
  authLimiter,
  sanitizeBody
};
