// GET /api/cambios?desde=123  →  { ultimo, usuarios }
// `ultimo`: id del cambio más reciente (la pantalla lo guarda y lo manda en la siguiente consulta).
// `usuarios`: quién hizo cambios después de `desde`, sin contar a esta misma pestaña.
import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';

const router = asyncRouter();

router.get('/', async (req, res) => {
  const desde = Number(req.query.desde);
  const cliente = String(req.get('x-cliente') || '');

  if (!Number.isInteger(desde) || desde < 0) {
    const [[{ ultimo }]] = await pool.query('SELECT COALESCE(MAX(id), 0) AS ultimo FROM cambios');
    return res.json({ ultimo: Number(ultimo), usuarios: [] });
  }

  // Sin cambios nuevos (lo normal) basta una consulta por la clave primaria
  const [filas] = await pool.query(
    'SELECT id, usuario, cliente FROM cambios WHERE id > ? ORDER BY id LIMIT 500', [desde]);
  const ultimo = filas.length ? filas[filas.length - 1].id : desde;
  // Los de esta misma pestaña no cuentan (ya los tiene); sin id de pestaña, se compara por usuario
  const ajenos = filas.filter((f) => (cliente ? f.cliente !== cliente : f.usuario !== req.usuario));
  res.json({ ultimo, usuarios: [...new Set(ajenos.map((f) => f.usuario))] });
});

export default router;
