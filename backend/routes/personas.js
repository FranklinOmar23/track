import { Router } from 'express';
import pool from '../db.js';

const router = Router();

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

  res.status(201).json({
    id: result.insertId,
    personaId,
    mes,
    monto,
  });
});

export default router;
