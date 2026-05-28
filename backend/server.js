import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import habitacionesRoutes from './routes/habitaciones.js';
import personasRoutes from './routes/personas.js';
import movimientosRoutes from './routes/movimientos.js';
import viajesRoutes from './routes/viajes.js';
import statsRoutes from './routes/stats.js'; // 👈 NUEVA

dotenv.config();

const app = express();
app.use(cors({
  origin: '*',  // Permite cualquier origen (solo para desarrollo)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/viajes', viajesRoutes);
app.use('/api/stats', statsRoutes); // 👈 NUEVA

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend en funcionamiento' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listo en http://localhost:${port}`);
});