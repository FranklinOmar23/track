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

  res.json({
    id: pagoId,
    personaId,
    mes,
    monto,
  });
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

export default router;
