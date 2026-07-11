import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db-init.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import logsRoutes from './routes/logs.js';
import { registrarError, registrarLog } from './utils/log.js';
import habitacionesRoutes from './routes/habitaciones.js';
import personasRoutes from './routes/personas.js';
import movimientosRoutes from './routes/movimientos.js';
import viajesRoutes from './routes/viajes.js';
import viajesPublicoRoutes from './routes/viajesPublico.js';
import statsRoutes from './routes/stats.js'; // 👈 NUEVA

dotenv.config();

const app = express();
app.use(cors({
  origin: '*',  // Permite cualquier origen (solo para desarrollo)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// También aceptar bodies form-urlencoded para compatibilidad con proxies
// que puedan transformar la petición (Hostinger, formularios, etc.).
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 4000;

app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      registrarError(new Error(`HTTP ${res.statusCode}`), {
        usuario: req.usuario || 'sistema',
        descripcion: `${req.method} ${req.originalUrl} -> ${res.statusCode}`,
        entidad: 'request',
      }).catch(() => {});
    }
  });

  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend en funcionamiento' });
});

app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Backend en línea</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #1f3c88 0%, #111827 45%, #030712 100%);
        color: #f9fafb;
      }
      .card {
        width: min(92vw, 560px);
        padding: 2rem;
        border-radius: 24px;
        background: rgba(17, 24, 39, 0.82);
        backdrop-filter: blur(14px);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.12);
        text-align: center;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.45rem 0.8rem;
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.18);
        color: #bbf7d0;
        font-weight: 700;
        margin-bottom: 1rem;
      }
      .badge::before {
        content: '';
        width: 0.65rem;
        height: 0.65rem;
        border-radius: 50%;
        background: #4ade80;
        box-shadow: 0 0 10px #4ade80;
      }
      h1 {
        margin: 0 0 0.7rem;
        font-size: 2rem;
      }
      p {
        margin: 0 0 1.2rem;
        color: #d1d5db;
        line-height: 1.6;
      }
      .links {
        display: flex;
        justify-content: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      a {
        text-decoration: none;
        color: #f9fafb;
        padding: 0.7rem 1rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="badge">Backend en línea</div>
      <h1>Backend corriendo</h1>
      <p>Tu servidor ya está respondiendo y listo para recibir solicitudes con un diseño más agradable.</p>
      <div class="links">
        <a href="/api/health">Ver estado de la API</a>
      </div>
    </main>
  </body>
</html>`);
});

app.use('/api/auth', authRoutes);
app.use('/api/viajes/publico', viajesPublicoRoutes); // vista pública, sin login

app.use('/api/habitaciones', requireAuth, habitacionesRoutes);
app.use('/api/personas', requireAuth, personasRoutes);
app.use('/api/movimientos', requireAuth, movimientosRoutes);
app.use('/api/viajes', requireAuth, viajesRoutes);
app.use('/api/stats', requireAuth, statsRoutes); // 👈 NUEVA
app.use('/api/logs', requireAuth, logsRoutes);

app.use((err, req, res, next) => {
  registrarError(err, {
    usuario: req.usuario || 'sistema',
    descripcion: `${req.method} ${req.originalUrl}`,
    entidad: 'request',
  }).catch(() => {});

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Error interno del servidor',
  });
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  registrarError(error, {
    descripcion: 'Unhandled Rejection',
    entidad: 'process',
  }).catch(() => {});
  console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  registrarError(error, {
    descripcion: 'Uncaught Exception',
    entidad: 'process',
  }).catch(() => {});
  console.error('Uncaught Exception:', error);
});

initDb()
  .then(() => {
    registrarLog('sistema', 'info', 'server', null, 'Backend iniciado correctamente').catch(() => {});
    console.log('Base de datos lista');
    app.listen(port, () => {
      console.log(`Backend listo en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    registrarError(error, {
      descripcion: 'Error inicializando la base de datos',
      entidad: 'database',
    }).catch(() => {});
    console.error('Error inicializando la base de datos:', error);
    console.warn('El servidor continuará y la vista de bienvenida seguirá disponible.');
    app.listen(port, () => {
      console.log(`Backend READY en http://localhost:${port}`);
    });
  });