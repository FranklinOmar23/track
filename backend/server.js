import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db-init.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import logsRoutes from './routes/logs.js';
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

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend en funcionamiento' });
});

app.use('/api/auth', authRoutes);
app.use('/api/viajes/publico', viajesPublicoRoutes); // vista pública, sin login

app.use('/api/habitaciones', requireAuth, habitacionesRoutes);
app.use('/api/personas', requireAuth, personasRoutes);
app.use('/api/movimientos', requireAuth, movimientosRoutes);
app.use('/api/viajes', requireAuth, viajesRoutes);
app.use('/api/stats', requireAuth, statsRoutes); // 👈 NUEVA
app.use('/api/logs', requireAuth, logsRoutes);

const port = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend listo en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Error inicializando la base de datos:', error);
    process.exit(1);
  });