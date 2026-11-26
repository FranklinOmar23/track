// Penalidades del hotel (p. ej. alguien que se sale del viaje después de cierta fecha).
// Van por fuera: no tocan el total por cobrar, lo pagado ni lo pendiente del viaje.
import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { tienePermiso, puedeVerViaje, MENSAJES } from '../utils/permisos.js';
import { registrarLog } from '../utils/log.js';
import { fmtMonto } from '../utils/auditoria.js';
import { normalizarFecha, hoyISO } from '../utils/pago.js';

const router = asyncRouter();

export const MOTIVOS = ['salida', 'no_show', 'cambio', 'otro'];

const CAMPOS = 'id, viaje_id, persona_id, persona_nombre, habitacion, motivo, fecha, monto, cobrado, pagada_hotel, nota, creado_por, created_at';

const datosViaje = async (viajeId) => {
  const [rows] = await pool.query(
    "SELECT id, nombre, divisa, COALESCE(estado, 'activo') AS estado FROM viajes WHERE id = ?", [viajeId]);
  return rows[0] || null;
};

const fotoPenalidad = async (conn, id) => {
  const [rows] = await conn.query(`SELECT ${CAMPOS} FROM penalidades WHERE id = ?`, [id]);
  const p = rows[0];
  return p ? { ...p, monto: Number(p.monto), cobrado: Number(p.cobrado), pagada_hotel: Number(p.pagada_hotel) } : null;
};

const aRespuesta = (p, comprobantes = 0) => ({
  id: p.id,
  viajeId: p.viaje_id,
  personaId: p.persona_id ?? null,
  // ¿La persona sigue en el viaje? (null si la penalidad no está asociada a nadie del sistema)
  personaEstado: p.persona_id ? (p.persona_vigente ? 'vigente' : 'eliminada') : null,
  personaNombre: p.persona_nombre,
  motivo: p.motivo || 'salida',
  habitacion: p.habitacion || '',
  fecha: p.fecha,
  monto: Number(p.monto),
  cobrado: Number(p.cobrado),
  pagadaHotel: !!Number(p.pagada_hotel),
  nota: p.nota || '',
  creadoPor: p.creado_por || null,
  createdAt: p.created_at,
  comprobantes: Number(comprobantes) || 0,
});

const redondear = (n) => Math.round(n * 100) / 100;

/** Valida el cuerpo de una penalidad. Devuelve { error } o los datos limpios (con nombres de columna). */
const normalizar = ({ personaId, personaNombre, habitacion, motivo, fecha, monto, cobrado, pagadaHotel, nota }) => {
  const nombre = String(personaNombre || '').trim().slice(0, 150);
  if (!nombre) return { error: 'Escribe el nombre de la persona.' };
  const f = normalizarFecha(fecha);
  if (f === false) return { error: 'Fecha inválida.' };
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0) return { error: 'El monto de la penalidad debe ser mayor que 0.' };
  const c = cobrado === '' || cobrado === null || cobrado === undefined ? 0 : Number(cobrado);
  if (!Number.isFinite(c) || c < 0) return { error: 'Lo cobrado no puede ser negativo.' };
  const pid = Number(personaId);
  return {
    persona_id: Number.isInteger(pid) && pid > 0 ? pid : null,
    persona_nombre: nombre,
    motivo: MOTIVOS.includes(motivo) ? motivo : 'salida',
    habitacion: String(habitacion || '').trim().slice(0, 30) || null,
    fecha: f || hoyISO(),
    monto: redondear(m),
    cobrado: redondear(c),
    pagada_hotel: pagadaHotel ? 1 : 0,
    nota: String(nota || '').trim().slice(0, 255) || null,
  };
};

/** Ver: acceso al viaje. Escribir: además permiso de pagos y viaje abierto. */
const rechazar = (req, res, viaje, { escribir = false } = {}) => {
  if (!viaje) { res.status(404).json({ error: 'Viaje no encontrado.' }); return true; }
  if (!puedeVerViaje(req.auth, viaje.id)) { res.status(403).json({ error: MENSAJES.viaje }); return true; }
  if (escribir && !tienePermiso(req.auth, 'pagos')) { res.status(403).json({ error: MENSAJES.pagos }); return true; }
  if (escribir && viaje.estado === 'cerrado') {
    res.status(403).json({ error: 'El viaje está cerrado. Reábrelo para hacer cambios.' });
    return true;
  }
  return false;
};

const descripcion = (d, viaje) =>
  `${d.persona_nombre}${d.habitacion ? ` (Hab. ${d.habitacion})` : ''}: ${fmtMonto(d.monto, viaje.divisa)} · ${viaje.nombre}`;

router.get('/', async (req, res) => {
  const viaje = await datosViaje(Number(req.query.viajeId));
  if (rechazar(req, res, viaje)) return;
  const [rows] = await pool.query(`
    SELECT p.*, (SELECT COUNT(*) FROM comprobantes c WHERE c.entidad = 'penalidad' AND c.entidad_id = p.id) AS n_comprobantes,
           EXISTS (SELECT 1 FROM personas pe WHERE pe.id = p.persona_id) AS persona_vigente
    FROM penalidades p WHERE p.viaje_id = ? ORDER BY p.fecha DESC, p.id DESC`, [viaje.id]);
  res.json({ penalidades: rows.map((p) => aRespuesta(p, p.n_comprobantes)) });
});

const leerJSON = (texto) => { try { return JSON.parse(texto); } catch { return null; } };

/**
 * Personas eliminadas de este viaje (las que no se han restaurado), sacadas del registro de actividad:
 * al eliminar una persona o una habitación se guarda una "foto" con sus datos para poder deshacer.
 */
router.get('/personas-eliminadas', async (req, res) => {
  const viaje = await datosViaje(Number(req.query.viajeId));
  if (rechazar(req, res, viaje)) return;

  const [[logs], [habs]] = await Promise.all([
    pool.query(`
      SELECT entidad, usuario, fecha, deshacer FROM logs_actividad
      WHERE accion = 'eliminar' AND entidad IN ('persona', 'habitacion') AND deshacer IS NOT NULL AND deshecho_at IS NULL
      ORDER BY fecha DESC, id DESC LIMIT 3000`),
    pool.query('SELECT id, numero FROM habitaciones WHERE viaje_id = ?', [viaje.id]),
  ]);

  // Habitaciones del viaje (las que existen y las eliminadas) → número
  const numeroHab = new Map(habs.map((h) => [h.id, String(h.numero)]));
  const datos = logs.map((l) => ({ ...l, d: leerJSON(l.deshacer) })).filter((l) => l.d?.foto);
  datos.forEach(({ d }) => {
    const h = d.foto.habitacion;
    if (h && Number(h.viaje_id) === viaje.id) numeroHab.set(h.id, String(h.numero));
  });

  const candidatas = new Map();
  for (const l of datos) {
    const lista = l.entidad === 'persona' ? [l.d.foto.persona] : l.d.foto.personas || [];
    for (const p of lista) {
      if (!p?.id || !p.nombre || candidatas.has(p.id) || !numeroHab.has(p.habitacion_id)) continue;
      candidatas.set(p.id, {
        id: p.id, nombre: p.nombre, habitacion: numeroHab.get(p.habitacion_id),
        eliminadoPor: l.usuario, eliminadoAt: l.fecha,
      });
    }
  }

  // Por si alguna se restauró por otra vía: solo las que de verdad ya no existen
  const ids = [...candidatas.keys()];
  if (ids.length) {
    const [vivas] = await pool.query(`SELECT id FROM personas WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    vivas.forEach((v) => candidatas.delete(v.id));
  }

  // Fuera las que se volvieron a agregar al viaje con el mismo nombre (siguen en el viaje),
  // y una sola entrada por persona y habitación (la eliminación más reciente: los logs vienen en orden descendente)
  const clave = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const [actuales] = await pool.query(
    'SELECT p.nombre FROM personas p JOIN habitaciones h ON h.id = p.habitacion_id WHERE h.viaje_id = ?', [viaje.id]);
  const enElViaje = new Set(actuales.map((p) => clave(p.nombre)));
  const vistas = new Set();
  const personas = [...candidatas.values()].filter((p) => {
    const k = `${clave(p.nombre)}|${p.habitacion}`;
    if (enElViaje.has(clave(p.nombre)) || vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
  res.json({ personas });
});

router.post('/', async (req, res) => {
  const viaje = await datosViaje(Number(req.body.viajeId));
  if (rechazar(req, res, viaje, { escribir: true })) return;
  const d = normalizar(req.body);
  if (d.error) return res.status(400).json({ error: d.error });

  const [r] = await pool.query(
    `INSERT INTO penalidades (viaje_id, persona_id, persona_nombre, habitacion, motivo, fecha, monto, cobrado, pagada_hotel, nota, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [viaje.id, d.persona_id, d.persona_nombre, d.habitacion, d.motivo, d.fecha, d.monto, d.cobrado, d.pagada_hotel, d.nota, req.usuario]);

  registrarLog(req.usuario, 'crear', 'penalidad', r.insertId,
    `${req.usuario} registró una penalidad del hotel a ${descripcion(d, viaje)}`,
    { op: 'penalidad.crear', penalidadId: r.insertId, despues: { fecha: d.fecha, monto: d.monto, cobrado: d.cobrado } });

  res.status(201).json(aRespuesta(await fotoPenalidad(pool, r.insertId)));
});

router.put('/:id', async (req, res) => {
  const antes = await fotoPenalidad(pool, Number(req.params.id));
  if (!antes) return res.status(404).json({ error: 'Penalidad no encontrada.' });
  const viaje = await datosViaje(antes.viaje_id);
  if (rechazar(req, res, viaje, { escribir: true })) return;
  const d = normalizar(req.body);
  if (d.error) return res.status(400).json({ error: d.error });

  await pool.query(
    `UPDATE penalidades SET persona_id = ?, persona_nombre = ?, habitacion = ?, motivo = ?, fecha = ?, monto = ?, cobrado = ?,
       pagada_hotel = ?, nota = ? WHERE id = ?`,
    [d.persona_id, d.persona_nombre, d.habitacion, d.motivo, d.fecha, d.monto, d.cobrado, d.pagada_hotel, d.nota, antes.id]);

  const campos = ['persona_id', 'persona_nombre', 'habitacion', 'motivo', 'fecha', 'monto', 'cobrado', 'pagada_hotel', 'nota'];
  registrarLog(req.usuario, 'editar', 'penalidad', antes.id,
    `${req.usuario} editó la penalidad de ${descripcion(d, viaje)} (cobrado ${fmtMonto(d.cobrado, viaje.divisa)})`,
    {
      op: 'penalidad.editar',
      penalidadId: antes.id,
      antes: Object.fromEntries(campos.map((k) => [k, antes[k]])),
      despues: Object.fromEntries(campos.map((k) => [k, d[k]])),
    });

  res.json(aRespuesta(await fotoPenalidad(pool, antes.id)));
});

router.delete('/:id', async (req, res) => {
  const antes = await fotoPenalidad(pool, Number(req.params.id));
  if (!antes) return res.status(404).json({ error: 'Penalidad no encontrada.' });
  const viaje = await datosViaje(antes.viaje_id);
  if (rechazar(req, res, viaje, { escribir: true })) return;

  // Los comprobantes se conservan: si se deshace la eliminación, vuelven a aparecer
  await pool.query('DELETE FROM penalidades WHERE id = ?', [antes.id]);
  registrarLog(req.usuario, 'eliminar', 'penalidad', antes.id,
    `${req.usuario} eliminó la penalidad de ${descripcion(antes, viaje)}`,
    { op: 'penalidad.eliminar', penalidad: antes });
  res.json({ ok: true });
});

export default router;
