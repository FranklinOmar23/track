import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, nota FROM viajes ORDER BY id DESC'
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, fechaInicio, fechaFin, nota } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre del viaje es requerido.' });
  }

  const [result] = await pool.query(
    'INSERT INTO viajes (nombre, fecha_inicio, fecha_fin, nota) VALUES (?, ?, ?, ?)',
    [nombre, fechaInicio || null, fechaFin || null, nota || null]
  );

  res.status(201).json({ id: result.insertId, nombre, fechaInicio, fechaFin, nota });
});

export default router;
