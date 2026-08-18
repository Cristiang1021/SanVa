# Sanva Shows — POS Boletos

Monorepo: `frontend/` (React + Vite) y `backend/` (Express + Turso).

## Desarrollo local

```bash
npm install          # raíz (concurrently)
npm install --prefix backend
npm install --prefix frontend

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

npm run dev          # levanta backend + frontend
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:3000/api  

Sin Turso en local usa `backend/database.sqlite`.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Sanva Shows POS"
git remote add origin https://github.com/TU_USUARIO/sanva-shows.git
git branch -M main
git push -u origin main
```

## Desplegar en Vercel (2 proyectos, 1 repo)

### Proyecto 1 — Frontend

| Campo | Valor |
|-------|--------|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output | `dist` |

**Variables:**

| Nombre | Valor |
|--------|--------|
| `VITE_API_URL` | `https://TU-BACKEND.vercel.app` |

### Proyecto 2 — Backend

| Campo | Valor |
|-------|--------|
| Root Directory | `backend` |
| Build Command | (vacío) |

**Variables:** ver `backend/.env.example` (Turso, JWT, superadmin, CORS, FRONTEND_URL).

### Orden de deploy

1. Deploy **backend** → copia su URL  
2. Pon `VITE_API_URL` en frontend → redeploy frontend  
3. Pon `FRONTEND_URL` y `CORS_ORIGIN` en backend → redeploy backend  
4. Abre el front → login superadmin → Configuraciones → Gmail  

### Health check

`GET https://TU-BACKEND.vercel.app/api/health`

## Variables de entorno

Ver archivos:

- `backend/.env.example` — todas las del API  
- `frontend/.env.example` — solo `VITE_API_URL`  
