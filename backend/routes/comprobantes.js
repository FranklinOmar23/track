// Comprobantes (vouchers): foto o PDF adjunto a una transferencia al hotel o a un pago.
// Se guardan en la base de datos (MEDIUMBLOB) para no depender del disco del hosting.
import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { tienePermiso, puedeVerViaje, MENSAJES } from '../utils/permisos.js';
import { registrarLog } from '../utils/log.js';

const router = asyncRouter();

export const MAX_COMPROBANTE = 5 * 1024 * 1024; // 5 MB
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const ENTIDADES = {
  transferencia: 'SELECT viaje_id FROM transferencias WHERE id = ?',
  penalidad: 'SELECT viaje_id FROM penalidades WHERE id = ?',
  pago: `SELECT h.viaje_id FROM pagos pg JOIN personas p ON p.id = pg.persona_id
         JOIN habitaciones h ON h.id = p.habitacion_id WHERE pg.id = ?`,
};

const NOMBRES = { pago: 'un pago', transferencia: 'una transferencia', penalidad: 'una penalidad' };

/** Viaje al que pertenece la transferencia o el pago (o null). */
const viajeDe = async (entidad, entidadId) => {
  const sql = ENTIDADES[entidad];
  if (!sql) return null;
  const [rows] = await pool.query(sql, [Number(entidadId)]);
  return rows[0]?.viaje_id ?? null;
};

const rechazar = (req, res, viajeId, { escribir = false } = {}) => {
  if (!viajeId) { res.status(404).json({ error: 'No se encontró a qué pertenece el comprobante.' }); return true; }
  if (!puedeVerViaje(req.auth, viajeId)) { res.status(403).json({ error: MENSAJES.viaje }); return true; }
  if (escribir && !tienePermiso(req.auth, 'pagos')) { res.status(403).json({ error: MENSAJES.pagos }); return true; }
  return false;
};

const aRespuesta = (c) => ({
  id: c.id, entidad: c.entidad, entidadId: c.entidad_id, nombre: c.nombre, mime: c.mime,
  tamano: c.tamano, subidoPor: c.subido_por, createdAt: c.created_at,
});

/** Comprobantes de una transferencia o un pago (sin el archivo). */
router.get('/', async (req, res) => {
  const { entidad, entidadId } = req.query;
  if (rechazar(req, res, await viajeDe(entidad, entidadId))) return;
  const [rows] = await pool.query(
    'SELECT id, entidad, entidad_id, nombre, mime, tamano, subido_por, created_at FROM comprobantes WHERE entidad = ? AND entidad_id = ? ORDER BY id',
    [entidad, Number(entidadId)]);
  res.json(rows.map(aRespuesta));
});

/** El archivo en sí. */
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM comprobantes WHERE id = ?', [Number(req.params.id)]);
  const c = rows[0];
  if (!c) return res.status(404).json({ error: 'Comprobante no encontrado.' });
  if (rechazar(req, res, await viajeDe(c.entidad, c.entidad_id))) return;
  res.set({
    'Content-Type': c.mime,
    'Content-Length': c.datos.length,
    'Content-Disposition': `inline; filename="${encodeURIComponent(c.nombre)}"`,
    'Cache-Control': 'private, max-age=3600',
  });
  res.send(c.datos);
});

/** Sube un comprobante: { entidad, entidadId, nombre, mime, datos (base64) }. */
router.post('/', async (req, res) => {
  const { entidad, entidadId, nombre, mime, datos } = req.body;
  if (!ENTIDADES[entidad]) return res.status(400).json({ error: 'Tipo de comprobante inválido.' });
  if (rechazar(req, res, await viajeDe(entidad, entidadId), { escribir: true })) return;
  if (!TIPOS.includes(mime)) return res.status(400).json({ error: 'Solo se aceptan fotos (JPG, PNG, WEBP) o PDF.' });

  const buffer = Buffer.from(String(datos || '').replace(/^data:[^,]*,/, ''), 'base64');
  if (!buffer.length) return res.status(400).json({ error: 'El archivo está vacío.' });
  if (buffer.length > MAX_COMPROBANTE) return res.status(413).json({ error: 'El archivo pesa más de 5 MB.' });

  const nombreLimpio = String(nombre || 'comprobante').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 200);
  const [r] = await pool.query(
    'INSERT INTO comprobantes (entidad, entidad_id, nombre, mime, tamano, datos, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [entidad, Number(entidadId), nombreLimpio, mime, buffer.length, buffer, req.usuario]);

  registrarLog(req.usuario, 'crear', 'comprobante', r.insertId,
    `${req.usuario} adjuntó un comprobante (${nombreLimpio}) a ${NOMBRES[entidad]} #${entidadId}`);

  const [rows] = await pool.query(
    'SELECT id, entidad, entidad_id, nombre, mime, tamano, subido_por, created_at FROM comprobantes WHERE id = ?', [r.insertId]);
  res.status(201).json(aRespuesta(rows[0]));
});

router.delete('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT id, entidad, entidad_id, nombre FROM comprobantes WHERE id = ?', [Number(req.params.id)]);
  const c = rows[0];
  if (!c) return res.status(404).json({ error: 'Comprobante no encontrado.' });
  if (rechazar(req, res, await viajeDe(c.entidad, c.entidad_id), { escribir: true })) return;

  await pool.query('DELETE FROM comprobantes WHERE id = ?', [c.id]);
  registrarLog(req.usuario, 'eliminar', 'comprobante', c.id,
    `${req.usuario} eliminó el comprobante ${c.nombre} de ${NOMBRES[c.entidad]} #${c.entidad_id}`);
  res.json({ ok: true });
});

export default router;
