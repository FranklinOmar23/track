import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const limitRaw = Number(req.query.limit) || 500;
  const limit = Math.min(Math.max(limitRaw, 1), 1000);

  const [rows] = await pool.query(
    'SELECT id, usuario, accion, entidad, entidad_id AS entidadId, descripcion, fecha FROM logs_actividad ORDER BY fecha DESC LIMIT ?',
    [limit]
  );

  res.json(rows);
});

export default router;
