import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { ajustarTipoPorAdultos } from '../utils/habitacion.js';
import { personaParamAbierta } from '../utils/viajeCerrado.js';
import { registrarLog } from '../utils/log.js';
import { normalizarPago } from '../utils/pago.js';

const router = asyncRouter();

router.patch('/:id/gratis', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const { esGratis } = req.body;
  await pool.query('UPDATE personas SET es_gratis = ? WHERE id = ?', [esGratis ? 1 : 0, personaId]);
  registrarLog(req.usuario, 'editar', 'persona', personaId, `${req.usuario} marcó a la persona ${personaId} como ${esGratis ? 'gratis' : 'no gratis'}`);
  res.json({ id: personaId, esGratis: !!esGratis });
});

// ← NUEVO: editar nombre de persona
router.put('/:id', personaParamAbierta, async (req, res) => {
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

  registrarLog(req.usuario, 'editar', 'persona', personaId, `${req.usuario} renombró a la persona ${personaId} a "${nombre.trim()}"`);

  res.json({ id: personaId, nombre: nombre.trim() });
});

router.post('/:id/pagos', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const pago = normalizarPago(req.body);
  if (pago.error) {
    return res.status(400).json({ error: pago.error });
  }
  const { mes, monto, anio } = pago;

  const [result] = await pool.query(
    'INSERT INTO pagos (persona_id, mes, monto, anio) VALUES (?, ?, ?, ?)',
    [personaId, mes, monto, anio]
  );

  registrarLog(req.usuario, 'pago', 'pago', result.insertId, `${req.usuario} registró un pago de ${monto} (${mes} ${anio}) a la persona ${personaId}`);

  res.status(201).json({ id: result.insertId, personaId, mes, monto, anio });
});

router.put('/:id/pagos/:pagoId', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const pagoId = Number(req.params.pagoId);
  const pago = normalizarPago(req.body);
  if (pago.error) {
    return res.status(400).json({ error: pago.error });
  }
  const { mes, monto, anio } = pago;

  const [result] = await pool.query(
    'UPDATE pagos SET mes = ?, monto = ?, anio = ? WHERE id = ? AND persona_id = ?',
    [mes, monto, anio, pagoId, personaId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  registrarLog(req.usuario, 'editar', 'pago', pagoId, `${req.usuario} editó el pago ${pagoId} de la persona ${personaId} a ${monto} (${mes} ${anio})`);

  res.json({ id: pagoId, personaId, mes, monto, anio });
});

router.delete('/:id/pagos/:pagoId', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const pagoId = Number(req.params.pagoId);

  const [result] = await pool.query(
    'DELETE FROM pagos WHERE id = ? AND persona_id = ?',
    [pagoId, personaId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  registrarLog(req.usuario, 'eliminar', 'pago', pagoId, `${req.usuario} eliminó el pago ${pagoId} de la persona ${personaId}`);

  res.json({ ok: true });
});

router.delete('/:id', personaParamAbierta, async (req, res) => {
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

    await ajustarTipoPorAdultos(connection, habitacionId);

    await connection.commit();
    registrarLog(req.usuario, 'eliminar', 'persona', personaId, `${req.usuario} eliminó a la persona ${personaId}`);
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;