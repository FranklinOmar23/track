import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import habitacionesRoutes from './routes/habitaciones.js';
import personasRoutes from './routes/personas.js';
import movimientosRoutes from './routes/movimientos.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/movimientos', movimientosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend en funcionamiento' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listo en http://localhost:${port}`);
});
