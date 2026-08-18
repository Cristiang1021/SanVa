const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sanitizeString } = require('../utils/security');

const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta más tarde.' }
});

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
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
