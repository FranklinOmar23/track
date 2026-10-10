import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { ajustarTipoPorAdultos } from '../utils/habitacion.js';
import { personaParamAbierta } from '../utils/viajeCerrado.js';
import { registrarLog } from '../utils/log.js';
import { normalizarPago } from '../utils/pago.js';
import { contextoPersona, fotoPago, fotoPersona, fmtMonto } from '../utils/auditoria.js';

const router = asyncRouter();

const periodo = (p) => `${p.mes} ${p.anio}`;

router.patch('/:id/gratis', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const esGratis = req.body.esGratis ? 1 : 0;
  const antes = await fotoPersona(pool, personaId);
  if (!antes) return res.status(404).json({ error: 'Persona no encontrada.' });

  await pool.query('UPDATE personas SET es_gratis = ? WHERE id = ?', [esGratis, personaId]);

  const ctx = await contextoPersona(pool, personaId);
  registrarLog(req.usuario, 'editar', 'persona', personaId,
    `${req.usuario} marcó a ${ctx.texto} como ${esGratis ? 'gratis' : 'que paga'}`,
    { op: 'persona.gratis', personaId, antes: Number(antes.persona.es_gratis), despues: esGratis });
  res.json({ id: personaId, esGratis: !!esGratis });
});

router.put('/:id', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Nombre es requerido.' });
  }

  const antes = await fotoPersona(pool, personaId);
  if (!antes) return res.status(404).json({ error: 'Persona no encontrada.' });

  await pool.query('UPDATE personas SET nombre = ? WHERE id = ?', [nombre.trim(), personaId]);

  const ctx = await contextoPersona(pool, personaId);
  registrarLog(req.usuario, 'editar', 'persona', personaId,
    `${req.usuario} renombró a "${antes.persona.nombre}" → "${nombre.trim()}" (${ctx.texto})`,
    { op: 'persona.renombrar', personaId, antes: antes.persona.nombre, despues: nombre.trim() });

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

  const ctx = await contextoPersona(pool, personaId);
  registrarLog(req.usuario, 'pago', 'pago', result.insertId,
    `${req.usuario} registró un pago de ${fmtMonto(monto, ctx.divisa)} (${mes} ${anio}) a ${ctx.texto}`,
    { op: 'pago.crear', pagoId: result.insertId, despues: { mes, anio, monto } });

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

  const antes = await fotoPago(pool, pagoId);
  if (!antes || antes.persona_id !== personaId) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  await pool.query('UPDATE pagos SET mes = ?, monto = ?, anio = ? WHERE id = ?', [mes, monto, anio, pagoId]);

  const ctx = await contextoPersona(pool, personaId);
  registrarLog(req.usuario, 'editar', 'pago', pagoId,
    `${req.usuario} editó un pago de ${ctx.texto}: ${fmtMonto(antes.monto, ctx.divisa)} ${periodo(antes)} → ${fmtMonto(monto, ctx.divisa)} ${mes} ${anio}`,
    {
      op: 'pago.editar',
      pagoId,
      antes: { mes: antes.mes, anio: antes.anio, monto: antes.monto },
      despues: { mes, anio, monto },
    });

  res.json({ id: pagoId, personaId, mes, monto, anio });
});

router.delete('/:id/pagos/:pagoId', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const pagoId = Number(req.params.pagoId);

  const antes = await fotoPago(pool, pagoId);
  if (!antes || antes.persona_id !== personaId) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  await pool.query('DELETE FROM pagos WHERE id = ?', [pagoId]);

  const ctx = await contextoPersona(pool, personaId);
  registrarLog(req.usuario, 'eliminar', 'pago', pagoId,
    `${req.usuario} eliminó un pago de ${fmtMonto(antes.monto, ctx.divisa)} (${periodo(antes)}) de ${ctx.texto}`,
    { op: 'pago.eliminar', pago: antes });

  res.json({ ok: true });
});

router.delete('/:id', personaParamAbierta, async (req, res) => {
  const personaId = Number(req.params.id);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const foto = await fotoPersona(connection, personaId);
    if (!foto) {
      await connection.rollback();
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    const habitacionId = foto.persona.habitacion_id;
    const ctx = await contextoPersona(connection, personaId);
    const [habRows] = await connection.query('SELECT tipo FROM habitaciones WHERE id = ?', [habitacionId]);

    await connection.query('DELETE FROM personas WHERE id = ?', [personaId]);
    await ajustarTipoPorAdultos(connection, habitacionId);

    await connection.commit();

    const totalPagos = foto.pagos.reduce((s, p) => s + p.monto, 0);
    registrarLog(req.usuario, 'eliminar', 'persona', personaId,
      `${req.usuario} eliminó a ${ctx.texto}${foto.pagos.length ? ` junto con ${foto.pagos.length} pago(s) por ${fmtMonto(totalPagos, ctx.divisa)}` : ''}`,
      { op: 'persona.eliminar', foto, tipoHabitacionAntes: habRows[0]?.tipo || null });
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
