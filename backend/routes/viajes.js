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

router.post('/default', async (req, res) => {
  const defaultNombre = 'Resort MamaTingo';
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [viajes] = await connection.query(
      'SELECT id, nombre, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, nota FROM viajes WHERE nombre = ? LIMIT 1',
      [defaultNombre]
    );

    let viaje;

    if (viajes.length > 0) {
      viaje = viajes[0];
    } else {
      const [result] = await connection.query(
        'INSERT INTO viajes (nombre, nota) VALUES (?, ?)',
        [defaultNombre, 'Viaje predeterminado para pagos existentes']
      );
      viaje = {
        id: result.insertId,
        nombre: defaultNombre,
        fechaInicio: null,
        fechaFin: null,
        nota: 'Viaje predeterminado para pagos existentes',
      };
    }

    await connection.query('UPDATE habitaciones SET viaje_id = ? WHERE viaje_id IS NULL', [viaje.id]);

    await connection.commit();
    res.status(200).json(viaje);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
