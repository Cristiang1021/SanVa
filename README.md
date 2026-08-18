# Sanva Shows — Sistema de venta de boletos

POS web para gestión de eventos, funciones, asientos, vendedores y reportes.  
Stack: **React + Vite** (frontend) · **Express + Sequelize** (backend) · **Turso/SQLite** (base de datos).

---

## Estructura del repositorio

```
sanva-shows/
├── frontend/          # App React (panel admin + vendedores)
├── backend/           # API REST + correos + PDF/Excel
├── package.json       # Script dev conjunto (opcional)
└── README.md
```

Un solo repositorio Git. En producción se despliegan **dos proyectos en Vercel** (mismo repo, distinta carpeta raíz).

---

## Requisitos

- Node.js 18+
- Cuenta en [Turso](https://turso.tech) (producción)
- Cuenta en [Vercel](https://vercel.com) (hosting)
- Cuenta en [GitHub](https://github.com) (código)

---

## Desarrollo local

### 1. Instalar dependencias

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

En Windows (PowerShell), para copiar las plantillas de entorno:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

### 2. Configurar `.env`

**`backend/.env`** — mínimo para local:

```env
JWT_SECRET=dev_secret_cambiar_en_produccion
JWT_EXPIRES_IN=24h
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Opcional: si las defines, usa Turso en lugar de SQLite local
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=...
```

**`frontend/.env`:**

```env
VITE_API_URL=http://localhost:3000
```

> Sin `TURSO_*` el backend usa `backend/database.sqlite` automáticamente.

### 3. Arrancar

```bash
npm run dev
```

| Servicio  | URL |
|-----------|-----|
| Frontend  | http://localhost:5173 |
| API       | http://localhost:3000/api |
| Health    | http://localhost:3000/api/health |

Al primer arranque se crea el **superadmin** (id:1). En local, si no defines `SUPERADMIN_PASSWORD`, revisa la consola del backend o usa las variables del `.env.example`.

---

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| **superadmin** | Todo + crear administradores (cuenta id:1, oculta en listados) |
| **admin** | Eventos, vendedores, reportes, configuración de correo |
| **vendedor** | Venta de boletos, mis ventas, lista de entrada (sin PDF) |

---

## Subir a GitHub

```bash
git add .
git commit -m "Sanva Shows: release inicial"
git remote add origin https://github.com/TU_USUARIO/sanva-shows.git
git branch -M main
git push -u origin main
```

Los archivos `.env` **no se suben** (están en `.gitignore`). Solo se versionan `.env.example`.

---

## Despliegue en Vercel

### ¿Por qué dos proyectos?

Vercel despliega **una app por proyecto**. Aquí hay dos apps en el mismo repo:

| Proyecto Vercel | Carpeta | Qué despliega |
|-----------------|---------|----------------|
| `sanva-api` (ejemplo) | `backend` | API Express |
| `sanva-web` (ejemplo) | `frontend` | Sitio React (Vite) |

Un `git push` puede actualizar ambos si los conectas al mismo repositorio.

---

### Paso 1 — Base de datos (Turso)

1. Crea una base en [turso.tech](https://turso.tech).
2. **Database → Connect** → copia:
   - `TURSO_DATABASE_URL` (formato `libsql://...`)
   - `TURSO_AUTH_TOKEN`

---

### Paso 2 — Proyecto backend en Vercel

1. **Add New → Project** → importa tu repo de GitHub.
2. **Root Directory:** `backend`
3. **Framework Preset:** Other
4. **Build Command:** déjalo vacío (usa `backend/vercel.json`).
5. **Environment Variables** — pega todo esto:

| Variable | Obligatorio | Ejemplo / notas |
|----------|:-----------:|-----------------|
| `TURSO_DATABASE_URL` | Sí | `libsql://mi-db-org.turso.io` |
| `TURSO_AUTH_TOKEN` | Sí | Token de Turso |
| `JWT_SECRET` | Sí | Clave aleatoria larga (32+ caracteres) |
| `JWT_EXPIRES_IN` | No | `24h` |
| `NODE_ENV` | Sí | `production` |
| `SUPERADMIN_USERNAME` | Sí | `superadmin` |
| `SUPERADMIN_EMAIL` | Sí | Tu correo |
| `SUPERADMIN_PASSWORD` | Sí | Contraseña fuerte |
| `SUPERADMIN_NOMBRE` | No | `Super Administrador` |
| `FRONTEND_URL` | Después* | URL del frontend (paso 4) |
| `CORS_ORIGIN` | Después* | Misma URL del frontend |

\*Puedes desplegar el backend primero sin `FRONTEND_URL`/`CORS_ORIGIN`; luego las añades y haces **Redeploy**.

6. **Deploy** → anota la URL, por ejemplo:  
   `https://sanva-api.vercel.app`

7. Verifica: abre `https://TU-API.vercel.app/api/health`  
   Debe responder `"status":"ok"` y `"turso":true`.

---

### Paso 3 — Proyecto frontend en Vercel

1. **Add New → Project** → **el mismo repo**.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Environment Variables:**

| Variable | Valor |
|----------|--------|
| `VITE_API_URL` | `https://sanva-api.vercel.app` |

> **Importante:** `VITE_API_URL` es la URL del **backend sin `/api`**.  
> Se embebe en el build: si la cambias, debes hacer **Redeploy** del frontend.

7. **Deploy** → anota la URL, por ejemplo:  
   `https://sanva-web.vercel.app`

---

### Paso 4 — Enlazar frontend ↔ backend

En el proyecto **backend** de Vercel, añade o actualiza:

```env
FRONTEND_URL=https://sanva-web.vercel.app
CORS_ORIGIN=https://sanva-web.vercel.app
```

**Redeploy** del backend.

---

### Paso 5 — Configuración post-deploy

1. Abre la URL del **frontend**.
2. Inicia sesión con el **superadmin**.
3. Ve a **Configuraciones → Correo (Gmail)** y configura SMTP + redes sociales.
4. Cambia tu contraseña en **Configuraciones → Mi contraseña**.
5. Crea **administradores** (menú solo visible para superadmin).
6. Crea **eventos** y vendedores desde el panel.

---

## Variables de entorno (referencia)

Plantillas completas:

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)

### Backend (producción)

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
JWT_SECRET=
JWT_EXPIRES_IN=24h
NODE_ENV=production
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=
SUPERADMIN_NOMBRE=Super Administrador
FRONTEND_URL=
CORS_ORIGIN=
```

### Frontend (producción)

```env
VITE_API_URL=https://tu-api.vercel.app
```

---

## Limitaciones en Vercel

- **Imágenes de eventos** (`backend/uploads/`): el disco en Vercel es efímero; las fotos subidas pueden perderse en un redeploy. Para producción estable conviene migrar a S3, Cloudinary o similar.
- **Correo:** se configura desde el panel (Gmail + contraseña de aplicación), no hace falta poner credenciales en Vercel salvo respaldo opcional.

---

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Backend + frontend en paralelo |
| `npm run dev:backend` | Solo API |
| `npm run dev:frontend` | Solo React |
| `npm run build --prefix frontend` | Build de producción del front |

---

## Soporte

Problemas frecuentes:

| Síntoma | Solución |
|---------|----------|
| Login falla en producción | Revisa `VITE_API_URL` y redeploy del frontend |
| Error CORS | `CORS_ORIGIN` debe ser exactamente la URL del front (`https://...`) |
| API 503 / BD | Revisa `TURSO_*` en el backend |
| Correos no llegan | Configura Gmail en **Configuraciones** del panel |

---

**Sanva Shows** · Sistema interno de venta de boletos
