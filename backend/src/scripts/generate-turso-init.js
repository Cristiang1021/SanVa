#!/usr/bin/env node
/**
 * Genera el SQL completo para inicializar Turso.
 *
 * Uso:
 *   node src/scripts/generate-turso-init.js
 *   node src/scripts/generate-turso-init.js --password "MiClave123!" --email "tu@correo.com"
 *
 * Copia la salida en Turso → SQL console → Run
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const password = getArg('--password', 'SanvaShows2026!');
const email = getArg('--email', 'superadmin@sanva.local');
const username = getArg('--username', 'superadmin');
const nombre = getArg('--nombre', 'Super Administrador');

const SCHEMA = `-- =============================================================================
-- Sanva Shows — Inicialización Turso (ejecutar UNA vez en SQL console)
-- =============================================================================

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS asientos;
DROP TABLE IF EXISTS funciones;
DROP TABLE IF EXISTS secciones;
DROP TABLE IF EXISTS eventos;
DROP TABLE IF EXISTS configuracion_smtp;
DROP TABLE IF EXISTS usuarios;

PRAGMA foreign_keys = ON;

-- usuarios
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'vendedor',
  nombre_completo VARCHAR(100) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  intentos_fallidos INTEGER DEFAULT 0,
  bloqueado_hasta DATETIME,
  email_verificado TINYINT(1) DEFAULT 0,
  token_verificacion_email VARCHAR(255),
  token_reset_password VARCHAR(255),
  reset_password_expira DATETIME,
  invitacion_pendiente TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- eventos
CREATE TABLE eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  imagen_url VARCHAR(500),
  fecha_unica DATE,
  hora_unica VARCHAR(5),
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- secciones
CREATE TABLE secciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  nombre VARCHAR(50) NOT NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  capacidad INTEGER NOT NULL DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- asientos
CREATE TABLE asientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seccion_id INTEGER NOT NULL REFERENCES secciones(id) ON DELETE CASCADE ON UPDATE CASCADE,
  fila VARCHAR(5) NOT NULL,
  numero INTEGER NOT NULL,
  posicion_x INTEGER DEFAULT 0,
  posicion_y INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'disponible',
  reservado_por INTEGER,
  reservado_hasta DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- funciones
CREATE TABLE funciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  fecha_hora DATETIME NOT NULL,
  lugar VARCHAR(100),
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- ventas
CREATE TABLE ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funcion_id INTEGER NOT NULL REFERENCES funciones(id) ON DELETE CASCADE ON UPDATE CASCADE,
  asiento_id INTEGER NOT NULL REFERENCES asientos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  cliente_nombre VARCHAR(100) NOT NULL,
  cliente_tel VARCHAR(20),
  cliente_email VARCHAR(100),
  metodo_pago VARCHAR(50) DEFAULT 'efectivo',
  referencia_pago VARCHAR(100),
  precio_unitario DECIMAL(10,2) NOT NULL,
  fecha_venta DATETIME NOT NULL
);

-- configuracion_smtp
CREATE TABLE configuracion_smtp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  smtp_email VARCHAR(150),
  smtp_password VARCHAR(500),
  from_nombre VARCHAR(100) DEFAULT 'SanVa Teatro',
  host VARCHAR(150) NOT NULL DEFAULT 'smtp.gmail.com',
  port INTEGER NOT NULL DEFAULT 587,
  activo TINYINT(1) NOT NULL DEFAULT 0,
  contacto_email VARCHAR(150),
  contacto_telefono VARCHAR(40),
  instagram VARCHAR(120),
  facebook VARCHAR(120),
  tiktok VARCHAR(120),
  youtube VARCHAR(120),
  twitter VARCHAR(120),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
`;

async function main() {
  const hash = await bcrypt.hash(password, 10);
  const escapedHash = hash.replace(/'/g, "''");

  const insert = `
-- superadmin (id:1)
INSERT INTO usuarios (
  id, username, email, password_hash, rol, nombre_completo,
  activo, intentos_fallidos, email_verificado, invitacion_pendiente,
  created_at, updated_at
) VALUES (
  1,
  '${username.replace(/'/g, "''")}',
  '${email.replace(/'/g, "''")}',
  '${escapedHash}',
  'superadmin',
  '${nombre.replace(/'/g, "''")}',
  1, 0, 1, 0,
  datetime('now'),
  datetime('now')
);
`;

  const sql = SCHEMA + insert;

  const outPath = path.join(__dirname, 'turso-init.sql');
  fs.writeFileSync(outPath, sql.trim() + '\n', 'utf8');

  console.log('-- Archivo generado:', outPath);
  console.log('-- Usuario:', username);
  console.log('-- Email:', email);
  console.log('-- Password (para login):', password);
  console.log('');
  console.log(sql);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
