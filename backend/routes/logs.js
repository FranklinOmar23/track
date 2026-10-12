import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { registrarLog } from '../utils/log.js';
import { OPERACIONES, ErrorDeshacer } from '../utils/deshacer.js';

const router = asyncRouter();

// Grupos del filtro "tipo" en la pantalla de Actividad
const GRUPOS = {
  usuarios: "accion NOT IN ('error', 'info', 'login_fallido')",
  pagos: "entidad = 'pago'",
  cambios: "accion IN ('crear', 'editar', 'eliminar', 'mover', 'deshacer')",
  accesos: "accion IN ('login', 'login_fallido')",
  sistema: "accion IN ('error', 'info')",
};

// GET /api/logs?tipo=usuarios&usuario=ODISLA&q=juan&limit=50&offset=0
router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = [];
  const params = [];

  if (GRUPOS[req.query.tipo]) where.push(GRUPOS[req.query.tipo]);
  if (req.query.usuario) { where.push('usuario = ?'); params.push(req.query.usuario); }
  if (req.query.q) { where.push('descripcion LIKE ?'); params.push(`%${req.query.q}%`); }
  if (req.query.desde) { where.push('fecha >= ?'); params.push(`${req.query.desde} 00:00:00`); }
  if (req.query.hasta) { where.push('fecha <= ?'); params.push(`${req.query.hasta} 23:59:59`); }
  if (req.query.acciones) {
    const acciones = String(req.query.acciones).split(',').map((a) => a.trim()).filter(Boolean);
    if (acciones.length) { where.push(`accion IN (${acciones.map(() => '?').join(',')})`); params.push(...acciones); }
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Página, total y lista de usuarios son independientes: en paralelo
  const [[rows], [[{ total }]], [usuarios]] = await Promise.all([
    pool.query(
      `SELECT id, usuario, accion, entidad, entidad_id AS entidadId, descripcion, fecha,
              deshacer IS NOT NULL AS tieneDeshacer, deshecho_at AS deshechoAt, deshecho_por AS deshechoPor
       FROM logs_actividad ${whereSql}
       ORDER BY fecha DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM logs_actividad ${whereSql}`, params),
    pool.query(
      "SELECT DISTINCT usuario FROM logs_actividad WHERE usuario IS NOT NULL AND usuario <> 'sistema' ORDER BY usuario"
    ),
  ]);

  res.json({
    logs: rows.map(({ tieneDeshacer, ...r }) => ({ ...r, puedeDeshacer: !!tieneDeshacer && !r.deshechoAt })),
    total: Number(total),
    usuarios: usuarios.map((u) => u.usuario),
  });
});

// POST /api/logs/:id/deshacer — revierte la acción registrada (una sola vez)
router.post('/:id/deshacer', async (req, res) => {
  const logId = Number(req.params.id);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT id, accion, entidad, entidad_id, descripcion, deshacer, deshecho_at FROM logs_actividad WHERE id = ? FOR UPDATE',
      [logId]
    );
    const log = rows[0];
    if (!log) throw new ErrorDeshacer('Registro no encontrado.');
    if (!log.deshacer) throw new ErrorDeshacer('Esta acción no se puede deshacer.');
    if (log.deshecho_at) throw new ErrorDeshacer('Esta acción ya fue deshecha.');

    const datos = JSON.parse(log.deshacer);
    const operacion = OPERACIONES[datos.op];
    if (!operacion) throw new ErrorDeshacer('Esta acción no se puede deshacer.');

    await operacion(connection, datos);
    await connection.query(
      'UPDATE logs_actividad SET deshecho_at = NOW(), deshecho_por = ? WHERE id = ?',
      [req.usuario, logId]
    );
    await connection.commit();

    await registrarLog(req.usuario, 'deshacer', log.entidad, log.entidad_id, `${req.usuario} deshizo: ${log.descripcion}`);
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    if (error instanceof ErrorDeshacer) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  } finally {
    connection.release();
  }
});

export default router;
