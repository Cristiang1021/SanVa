const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize, useTurso } = require('./src/config/database');
const inicializarDB = require('./src/config/initDb');
const authRoutes = require('./src/routes/auth');
const eventoRoutes = require('./src/routes/eventos');
const seccionRoutes = require('./src/routes/secciones');
const asientoRoutes = require('./src/routes/asientos');
const funcionRoutes = require('./src/routes/funciones');
const ventaRoutes = require('./src/routes/ventas');
const reporteRoutes = require('./src/routes/reportes');
const usuarioRoutes = require('./src/routes/usuarios');
const configuracionRoutes = require('./src/routes/configuracion');
const { helmetMiddleware, apiLimiter, sanitizeBody } = require('./src/middleware/security');
const path = require('path');

dotenv.config();

const app = express();
const isServerless = Boolean(process.env.VERCEL);

const corsOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmetMiddleware);
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true,
}));
app.use(express.json({ limit: '8mb' }));
app.use(sanitizeBody);
app.use('/api', apiLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let dbInitPromise = null;

const initDatabase = () => {
  if (!dbInitPromise) {
    dbInitPromise = sequelize
      .authenticate()
      .then(() => {
        console.log(useTurso ? '✓ Conexión a Turso establecida' : '✓ Conexión a SQLite local establecida');
        return inicializarDB();
      })
      .catch((err) => {
        dbInitPromise = null;
        throw err;
      });
  }
  return dbInitPromise;
};

if (isServerless) {
  app.use(async (req, res, next) => {
    try {
      await initDatabase();
      next();
    } catch (err) {
      console.error('✗ Error al conectar con la base de datos:', err);
      res.status(503).json({ error: 'Base de datos no disponible.' });
    }
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/secciones', seccionRoutes);
app.use('/api/asientos', asientoRoutes);
app.use('/api/funciones', funcionRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/configuracion', configuracionRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API funcionando',
    turso: useTurso,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

if (!isServerless) {
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✓ Servidor corriendo en puerto ${PORT}`);
        console.log(`✓ API disponible en http://localhost:${PORT}/api`);
      });
    })
    .catch((err) => {
      console.error('✗ Error al conectar con la base de datos:', err);
      process.exit(1);
    });
}

module.exports = app;
