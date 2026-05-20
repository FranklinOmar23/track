import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.post('/', async (req, res) => {
  const { personaId, destinoHabitacionId } = req.body;

  if (!personaId || !destinoHabitacionId) {
    return res.status(400).json({ error: 'personaId y destinoHabitacionId son requeridos.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [personaRows] = await connection.query('SELECT habitacion_id FROM personas WHERE id = ?', [personaId]);
    if (!personaRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    const habitacionOrigenId = personaRows[0].habitacion_id;
    const [destHabRows] = await connection.query('SELECT tipo FROM habitaciones WHERE id = ?', [destinoHabitacionId]);
    if (!destHabRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Habitación de destino no encontrada.' });
    }

    const capacidad = destHabRows[0].tipo === 'Triple' ? 3 : 2;
    const [ocupacionRows] = await connection.query(
      'SELECT COUNT(*) AS total FROM personas WHERE habitacion_id = ?',
      [destinoHabitacionId]
    );

    if (ocupacionRows[0].total >= capacidad) {
      await connection.rollback();
      return res.status(400).json({ error: 'La habitación destino no tiene espacio disponible.' });
    }

    const [ultimaPos] = await connection.query(
      'SELECT IFNULL(MAX(posicion), 0) AS maxPos FROM personas WHERE habitacion_id = ?',
      [destinoHabitacionId]
    );

    const nuevaPosicion = ultimaPos[0].maxPos + 1;

    await connection.query(
      'UPDATE personas SET habitacion_id = ?, posicion = ? WHERE id = ?',
      [destinoHabitacionId, nuevaPosicion, personaId]
    );

    await connection.query(
      'INSERT INTO historial_movimientos (persona_id, habitacion_origen_id, habitacion_destino_id) VALUES (?, ?, ?)',
      [personaId, habitacionOrigenId, destinoHabitacionId]
    );

    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
