import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { ajustarTipoPorAdultos, reordenarPosiciones } from '../utils/habitacion.js';
import { personaEditable, MENSAJE_VIAJE_CERRADO } from '../utils/viajeCerrado.js';
import { tienePermiso, puedeVerViaje, MENSAJES } from '../utils/permisos.js';
import { registrarLog } from '../utils/log.js';
import { normalizarPago } from '../utils/pago.js';
import { contextoPersona, contextoHabitacion, fotoPago, fotoPersona, fmtMonto } from '../utils/auditoria.js';

const router = asyncRouter();

const periodo = (p) => `${p.mes} ${p.anio}`;

/** Pagos: responde 403/404/409 si no hay permiso, acceso, la persona no existe o el viaje está cerrado. */
const rechazarSiNoEditable = (req, res, ctx) => {
  if (!tienePermiso(req.auth, 'pagos')) { res.status(403).json({ error: MENSAJES.pagos }); return true; }
  if (!ctx.existe) { res.status(404).json({ error: 'Persona no encontrada.' }); return true; }
  if (!puedeVerViaje(req.auth, ctx.viajeId)) { res.status(403).json({ error: MENSAJES.viaje }); return true; }
  if (ctx.cerrado) { res.status(409).json({ error: MENSAJE_VIAJE_CERRADO }); return true; }
  return false;
};

router.patch('/:id/gratis', personaEditable('editar'), async (req, res) => {
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

router.patch('/:id/stack', personaEditable('editar'), async (req, res) => {
  const personaId = Number(req.params.id);
  const esStack = req.body.esStack ? 1 : 0;
  const antes = await fotoPersona(pool, personaId);
  if (!antes) return res.status(404).json({ error: 'Persona no encontrada.' });

  await pool.query('UPDATE personas SET es_stack = ? WHERE id = ?', [esStack, personaId]);

  const ctx = await contextoPersona(pool, personaId);
  registrarLog(req.usuario, 'editar', 'persona', personaId,
    `${req.usuario} ${esStack ? 'marcó como stack (no paga)' : 'quitó el stack de'} ${ctx.texto}`,
    { op: 'persona.stack', personaId, antes: Number(antes.persona.es_stack), despues: esStack });
  res.json({ id: personaId, esStack: !!esStack });
});

/** Hace titular a la persona: pasa a la primera posición y el resto conserva su orden. */
router.patch('/:id/titular', personaEditable('editar'), async (req, res) => {
  const personaId = Number(req.params.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [personaRows] = await connection.query('SELECT habitacion_id, nombre FROM personas WHERE id = ?', [personaId]);
    if (!personaRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }
    const habitacionId = personaRows[0].habitacion_id;
    const [todas] = await connection.query(
      'SELECT id, nombre, posicion FROM personas WHERE habitacion_id = ? ORDER BY posicion, id FOR UPDATE', [habitacionId]);

    if (todas[0]?.id === personaId) {
      await connection.rollback();
      return res.json({ ok: true, sinCambios: true });
    }

    const antes = todas.map((p) => ({ id: p.id, posicion: p.posicion }));
    const orden = [todas.find((p) => p.id === personaId), ...todas.filter((p) => p.id !== personaId)];
    const despues = orden.map((p, i) => ({ id: p.id, posicion: i + 1 }));
    await reordenarPosiciones(connection, habitacionId, despues);
    await connection.commit();

    const textoHab = await contextoHabitacion(pool, habitacionId);
    registrarLog(req.usuario, 'editar', 'persona', personaId,
      `${req.usuario} cambió el titular de la ${textoHab}: ${todas[0].nombre} → ${personaRows[0].nombre}`,
      { op: 'persona.titular', habitacionId, antes, despues });
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando el titular:', error);
    res.status(500).json({ error: 'No se pudo cambiar el titular. Intenta de nuevo.' });
  } finally {
    connection.release();
  }
});

router.put('/:id', personaEditable('editar'), async (req, res) => {
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

router.post('/:id/pagos', async (req, res) => {
  const personaId = Number(req.params.id);
  const pago = normalizarPago(req.body);
  if (pago.error) {
    return res.status(400).json({ error: pago.error });
  }
  const { mes, monto, anio, fechaRecibido } = pago;

  const ctx = await contextoPersona(pool, personaId);
  if (rechazarSiNoEditable(req, res, ctx)) return;

  const [result] = await pool.query(
    'INSERT INTO pagos (persona_id, mes, monto, anio, fecha_recibido) VALUES (?, ?, ?, ?, ?)',
    [personaId, mes, monto, anio, fechaRecibido]
  );

  registrarLog(req.usuario, 'pago', 'pago', result.insertId,
    `${req.usuario} registró un pago de ${fmtMonto(monto, ctx.divisa)} (${mes} ${anio}) a ${ctx.texto}`,
    { op: 'pago.crear', pagoId: result.insertId, despues: { mes, anio, monto, fecha_recibido: fechaRecibido } });

  res.status(201).json({ id: result.insertId, personaId, mes, monto, anio, fechaRecibido, comprobantes: 0 });
});

router.put('/:id/pagos/:pagoId', async (req, res) => {
  const personaId = Number(req.params.id);
  const pagoId = Number(req.params.pagoId);
  const pago = normalizarPago(req.body);
  if (pago.error) {
    return res.status(400).json({ error: pago.error });
  }
  const { mes, monto, anio, fechaRecibido } = pago;

  const [antes, ctx] = await Promise.all([fotoPago(pool, pagoId), contextoPersona(pool, personaId)]);
  if (rechazarSiNoEditable(req, res, ctx)) return;
  if (!antes || antes.persona_id !== personaId) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  await pool.query('UPDATE pagos SET mes = ?, monto = ?, anio = ?, fecha_recibido = ? WHERE id = ?',
    [mes, monto, anio, fechaRecibido, pagoId]);

  registrarLog(req.usuario, 'editar', 'pago', pagoId,
    `${req.usuario} editó un pago de ${ctx.texto}: ${fmtMonto(antes.monto, ctx.divisa)} ${periodo(antes)} → ${fmtMonto(monto, ctx.divisa)} ${mes} ${anio}`,
    {
      op: 'pago.editar',
      pagoId,
      antes: { mes: antes.mes, anio: antes.anio, monto: antes.monto, fecha_recibido: antes.fecha_recibido },
      despues: { mes, anio, monto, fecha_recibido: fechaRecibido },
    });

  res.json({ id: pagoId, personaId, mes, monto, anio, fechaRecibido });
});

router.delete('/:id/pagos/:pagoId', async (req, res) => {
  const personaId = Number(req.params.id);
  const pagoId = Number(req.params.pagoId);

  const [antes, ctx] = await Promise.all([fotoPago(pool, pagoId), contextoPersona(pool, personaId)]);
  if (rechazarSiNoEditable(req, res, ctx)) return;
  if (!antes || antes.persona_id !== personaId) {
    return res.status(404).json({ error: 'Pago no encontrado.' });
  }

  await pool.query('DELETE FROM pagos WHERE id = ?', [pagoId]);

  registrarLog(req.usuario, 'eliminar', 'pago', pagoId,
    `${req.usuario} eliminó un pago de ${fmtMonto(antes.monto, ctx.divisa)} (${periodo(antes)}) de ${ctx.texto}`,
    { op: 'pago.eliminar', pago: antes });

  res.json({ ok: true });
});

router.delete('/:id', personaEditable('editar'), async (req, res) => {
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
