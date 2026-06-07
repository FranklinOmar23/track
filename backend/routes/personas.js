import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.patch('/:id/gratis', async (req, res) => {
  const personaId = Number(req.params.id);
  const { esGratis } = req.body;
  await pool.query('UPDATE personas SET es_gratis = ? WHERE id = ?', [esGratis ? 1 : 0, personaId]);
  res.json({ id: personaId, esGratis: !!esGratis });
});

// ← NUEVO: editar nombre de persona
router.put('/:id', async (req, res) => {
  const personaId = Number(req.params.id);
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Nombre es requerido.' });
  }

  const [result] = await pool.query(
    'UPDATE personas SET nombre = ? WHERE id = ?',
    [nombre.trim(), personaId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Persona no encontrada.' });
  }

  res.json({ id: personaId, nombre: nombre.trim() });
});

router.post('/:id/pagos', async (req, res) => {
  const personaId = Number(req.params.id);
  const { mes, monto } = req.body;

  if (!mes || typeof monto !== 'number') {
    return res.status(400).json({ error: 'Mes y monto son requeridos.' });
  }

  const [result] = await pool.query(
    'INSERT INTO pagos (persona_id, mes, monto) VALUES (?, ?, ?)',
    [personaId, mes, monto]
  );

  res.status(201).json({ id: result.insertId, personaId, mes, monto });
});

router.put('/:id/pagos/:pagoId', async (req, res) => {
  const personaId = Number(req.params.id);
  const pagoId = Number(req.params.pagoId);
  const { mes, monto } = req.body;

  if (!mes || typeof monto !== 'number') {
    return res.status(400).json({ error: 'Mes y monto son requeridos.' });
  }

  const [result] = await pool.query(
    'UPDATE pagos SET mes = ?, monto = ? WHERE id = ? AND persona_id = ?',
    [mes, monto, pagoId, personaId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  res.json({ id: pagoId, personaId, mes, monto });
});

router.delete('/:id/pagos/:pagoId', async (req, res) => {
  const personaId = Number(req.params.id);
  const pagoId = Number(req.params.pagoId);

  const [result] = await pool.query(
    'DELETE FROM pagos WHERE id = ? AND persona_id = ?',
    [pagoId, personaId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const personaId = Number(req.params.id);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [personaRows] = await connection.query(
      'SELECT habitacion_id FROM personas WHERE id = ?',
      [personaId]
    );

    if (!personaRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    const habitacionId = personaRows[0].habitacion_id;
    await connection.query('DELETE FROM personas WHERE id = ?', [personaId]);

    const [remaining] = await connection.query(
      'SELECT COUNT(*) as count FROM personas WHERE habitacion_id = ? AND nombre IS NOT NULL AND nombre != ""',
      [habitacionId]
    );

    const newOccupancy = remaining[0].count;
    const newTipo = newOccupancy === 1 ? 'Single' : newOccupancy === 2 ? 'Doble' : 'Triple';

    const [habitacion] = await connection.query(
      'SELECT tipo FROM habitaciones WHERE id = ?',
      [habitacionId]
    );

    if (habitacion.length && newTipo !== habitacion[0].tipo) {
      await connection.query(
        'UPDATE habitaciones SET tipo = ? WHERE id = ?',
        [newTipo, habitacionId]
      );
    }

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