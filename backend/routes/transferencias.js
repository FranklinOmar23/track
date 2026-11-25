// Transferencias al hotel / proveedor de cada viaje y saldo "en cuenta" (cobrado − transferido).
import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { tienePermiso, puedeVerViaje, MENSAJES } from '../utils/permisos.js';
import { registrarLog } from '../utils/log.js';
import { fmtMonto } from '../utils/auditoria.js';
import { normalizarFecha, hoyISO } from '../utils/pago.js';

const router = asyncRouter();

const datosViaje = async (viajeId) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, divisa, saldo_banco, saldo_banco_at, saldo_banco_por FROM viajes WHERE id = ?', [viajeId]);
  return rows[0] || null;
};

const fotoTransferencia = async (conn, id) => {
  const [rows] = await conn.query(
    'SELECT id, viaje_id, fecha, monto, corte, referencia, nota, creado_por, created_at FROM transferencias WHERE id = ?', [id]);
  return rows[0] ? { ...rows[0], monto: Number(rows[0].monto) } : null;
};

const aRespuesta = (t, comprobantes = 0) => ({
  id: t.id,
  viajeId: t.viaje_id,
  fecha: t.fecha,
  monto: Number(t.monto),
  corte: t.corte || null,
  referencia: t.referencia || '',
  nota: t.nota || '',
  creadoPor: t.creado_por || null,
  createdAt: t.created_at,
  comprobantes: Number(comprobantes) || 0,
});

/** Valida el cuerpo de una transferencia. Devuelve { error } o los datos limpios. */
const normalizar = ({ fecha, monto, corte, referencia, nota }) => {
  const f = normalizarFecha(fecha);
  if (f === false) return { error: 'Fecha inválida.' };
  const c = normalizarFecha(corte);
  if (c === false) return { error: 'Fecha de corte inválida.' };
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0) return { error: 'El monto debe ser mayor que 0.' };
  return {
    fecha: f || hoyISO(),
    monto: Math.round(m * 100) / 100,
    corte: c,
    referencia: String(referencia || '').trim().slice(0, 100) || null,
    nota: String(nota || '').trim().slice(0, 255) || null,
  };
};

/** Permisos: ver el viaje siempre; para escribir, además, el permiso de pagos. */
const rechazar = (req, res, viaje, { escribir = false } = {}) => {
  if (!viaje) { res.status(404).json({ error: 'Viaje no encontrado.' }); return true; }
  if (!puedeVerViaje(req.auth, viaje.id)) { res.status(403).json({ error: MENSAJES.viaje }); return true; }
  if (escribir && !tienePermiso(req.auth, 'pagos')) { res.status(403).json({ error: MENSAJES.pagos }); return true; }
  return false;
};

/** Lista de transferencias del viaje + resumen de saldos. */
router.get('/', async (req, res) => {
  const viajeId = Number(req.query.viajeId);
  const viaje = await datosViaje(viajeId);
  if (rechazar(req, res, viaje)) return;

  const [[transferencias], [[cobro]]] = await Promise.all([
    pool.query(`
      SELECT t.*, (SELECT COUNT(*) FROM comprobantes c WHERE c.entidad = 'transferencia' AND c.entidad_id = t.id) AS n_comprobantes
      FROM transferencias t WHERE t.viaje_id = ? ORDER BY t.fecha DESC, t.id DESC`, [viajeId]),
    pool.query(`
      SELECT COALESCE(SUM(pg.monto), 0) AS cobrado
      FROM pagos pg JOIN personas p ON p.id = pg.persona_id JOIN habitaciones h ON h.id = p.habitacion_id
      WHERE h.viaje_id = ?`, [viajeId]),
  ]);

  const cobrado = Number(cobro.cobrado);
  const transferido = transferencias.reduce((s, t) => s + Number(t.monto), 0);
  res.json({
    transferencias: transferencias.map((t) => aRespuesta(t, t.n_comprobantes)),
    resumen: {
      cobrado,
      transferido,
      enCuenta: Math.round((cobrado - transferido) * 100) / 100,
      saldoBanco: viaje.saldo_banco === null ? null : Number(viaje.saldo_banco),
      saldoBancoAt: viaje.saldo_banco_at,
      saldoBancoPor: viaje.saldo_banco_por,
    },
  });
});

router.post('/', async (req, res) => {
  const viaje = await datosViaje(Number(req.body.viajeId));
  if (rechazar(req, res, viaje, { escribir: true })) return;
  const datos = normalizar(req.body);
  if (datos.error) return res.status(400).json({ error: datos.error });

  const [r] = await pool.query(
    'INSERT INTO transferencias (viaje_id, fecha, monto, corte, referencia, nota, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [viaje.id, datos.fecha, datos.monto, datos.corte, datos.referencia, datos.nota, req.usuario]);
  const creada = await fotoTransferencia(pool, r.insertId);

  registrarLog(req.usuario, 'crear', 'transferencia', r.insertId,
    `${req.usuario} registró una transferencia al hotel de ${fmtMonto(datos.monto, viaje.divisa)} (${datos.fecha}) · ${viaje.nombre}`,
    { op: 'transferencia.crear', transferenciaId: r.insertId, despues: { fecha: datos.fecha, monto: datos.monto } });

  res.status(201).json(aRespuesta(creada));
});

router.put('/saldo-banco', async (req, res) => {
  const viaje = await datosViaje(Number(req.body.viajeId));
  if (rechazar(req, res, viaje, { escribir: true })) return;
  const vacio = req.body.saldo === null || req.body.saldo === '' || req.body.saldo === undefined;
  const saldo = vacio ? null : Number(req.body.saldo);
  if (!vacio && !Number.isFinite(saldo)) return res.status(400).json({ error: 'Saldo inválido.' });

  await pool.query(
    'UPDATE viajes SET saldo_banco = ?, saldo_banco_at = ?, saldo_banco_por = ? WHERE id = ?',
    [saldo, vacio ? null : new Date(), vacio ? null : req.usuario, viaje.id]);
  registrarLog(req.usuario, 'editar', 'viaje', viaje.id,
    vacio
      ? `${req.usuario} quitó el saldo del banco de ${viaje.nombre}`
      : `${req.usuario} anotó el saldo del banco de ${viaje.nombre}: ${fmtMonto(saldo, viaje.divisa)}`);
  res.json({ saldoBanco: saldo, saldoBancoAt: vacio ? null : new Date(), saldoBancoPor: vacio ? null : req.usuario });
});

router.put('/:id', async (req, res) => {
  const antes = await fotoTransferencia(pool, Number(req.params.id));
  if (!antes) return res.status(404).json({ error: 'Transferencia no encontrada.' });
  const viaje = await datosViaje(antes.viaje_id);
  if (rechazar(req, res, viaje, { escribir: true })) return;
  const datos = normalizar(req.body);
  if (datos.error) return res.status(400).json({ error: datos.error });

  await pool.query(
    'UPDATE transferencias SET fecha = ?, monto = ?, corte = ?, referencia = ?, nota = ? WHERE id = ?',
    [datos.fecha, datos.monto, datos.corte, datos.referencia, datos.nota, antes.id]);

  registrarLog(req.usuario, 'editar', 'transferencia', antes.id,
    `${req.usuario} editó una transferencia de ${viaje.nombre}: ${fmtMonto(antes.monto, viaje.divisa)} (${antes.fecha}) → ${fmtMonto(datos.monto, viaje.divisa)} (${datos.fecha})`,
    {
      op: 'transferencia.editar',
      transferenciaId: antes.id,
      antes: { fecha: antes.fecha, monto: antes.monto, corte: antes.corte, referencia: antes.referencia, nota: antes.nota },
      despues: { fecha: datos.fecha, monto: datos.monto, corte: datos.corte, referencia: datos.referencia, nota: datos.nota },
    });

  res.json(aRespuesta(await fotoTransferencia(pool, antes.id)));
});

router.delete('/:id', async (req, res) => {
  const antes = await fotoTransferencia(pool, Number(req.params.id));
  if (!antes) return res.status(404).json({ error: 'Transferencia no encontrada.' });
  const viaje = await datosViaje(antes.viaje_id);
  if (rechazar(req, res, viaje, { escribir: true })) return;

  // Los comprobantes se conservan: si se deshace la eliminación, vuelven a aparecer
  await pool.query('DELETE FROM transferencias WHERE id = ?', [antes.id]);
  registrarLog(req.usuario, 'eliminar', 'transferencia', antes.id,
    `${req.usuario} eliminó una transferencia de ${fmtMonto(antes.monto, viaje.divisa)} (${antes.fecha}) de ${viaje.nombre}`,
    { op: 'transferencia.eliminar', transferencia: antes });
  res.json({ ok: true });
});

export default router;
