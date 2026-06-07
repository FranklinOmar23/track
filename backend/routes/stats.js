import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// ─── DASHBOARD EXISTENTE ────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const [statsViajes] = await pool.query(`
      SELECT 
        v.id,
        v.nombre,
        COALESCE(v.tipo, 'resort') as tipo,
        v.slug,
        v.fecha_inicio,
        v.fecha_fin,
        COALESCE(
          (SELECT SUM(h.total) FROM habitaciones h WHERE h.viaje_id = v.id), 0
        ) as total_por_cobrar,
        COALESCE(
          (SELECT SUM(p.monto)
            FROM pagos p
            JOIN personas pers ON p.persona_id = pers.id
            JOIN habitaciones h ON pers.habitacion_id = h.id
            WHERE h.viaje_id = v.id), 0
        ) as total_pagado,
        COALESCE(
          (SELECT COUNT(DISTINCT h.id) FROM habitaciones h WHERE h.viaje_id = v.id), 0
        ) as total_habitaciones,
        COALESCE(
          (SELECT COUNT(DISTINCT pers.id)
            FROM personas pers
            JOIN habitaciones h ON pers.habitacion_id = h.id
            WHERE h.viaje_id = v.id), 0
        ) as total_personas
      FROM viajes v
      ORDER BY v.id DESC
    `);

    const viajesConPendiente = statsViajes.map(v => ({
      ...v,
      total_por_cobrar: Number(v.total_por_cobrar),
      total_pagado: Number(v.total_pagado),
      pendiente: Number(v.total_por_cobrar) - Number(v.total_pagado),
      total_habitaciones: Number(v.total_habitaciones),
      total_personas: Number(v.total_personas),
    }));

    const totalGlobalPorCobrar = viajesConPendiente.reduce((s, v) => s + v.total_por_cobrar, 0);
    const totalGlobalPagado    = viajesConPendiente.reduce((s, v) => s + v.total_pagado,    0);

    res.json({
      resumen: {
        total_viajes: viajesConPendiente.length,
        total_resorts: viajesConPendiente.filter(v => v.tipo === 'resort').length,
        total_tours:   viajesConPendiente.filter(v => v.tipo === 'tour').length,
        total_por_cobrar: totalGlobalPorCobrar,
        total_pagado:     totalGlobalPagado,
        total_pendiente:  totalGlobalPorCobrar - totalGlobalPagado,
        porcentaje_pagado: totalGlobalPorCobrar > 0
          ? ((totalGlobalPagado / totalGlobalPorCobrar) * 100).toFixed(1)
          : 0,
      },
      viajes: viajesConPendiente,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── REPORTE: PAGOS POR MES (global o filtrado por viaje) ───────────────────
// GET /api/stats/reportes/pagos-por-mes?viajeId=X
router.get('/reportes/pagos-por-mes', async (req, res) => {
  try {
    const { viajeId } = req.query;
    const params = [];
    const whereViaje = viajeId ? 'AND h.viaje_id = ?' : '';
    if (viajeId) params.push(Number(viajeId));

    const [rows] = await pool.query(`
      SELECT
        p.mes,
        SUM(p.monto) as total,
        COUNT(p.id)  as cantidad_pagos
      FROM pagos p
      JOIN personas pers ON p.persona_id = pers.id
      JOIN habitaciones h ON pers.habitacion_id = h.id
      WHERE 1=1 ${whereViaje}
      GROUP BY p.mes
      ORDER BY FIELD(p.mes,
        'Ene','Feb','Mar','Abr','May','Jun',
        'Jul','Ago','Sep','Oct','Nov','Dic'
      )
    `, params);

    res.json(rows.map(r => ({
      mes: r.mes,
      total: Number(r.total),
      cantidad_pagos: Number(r.cantidad_pagos),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── REPORTE: RESUMEN POR ETIQUETA (global o por viaje) ─────────────────────
// GET /api/stats/reportes/por-etiqueta?viajeId=X
router.get('/reportes/por-etiqueta', async (req, res) => {
  try {
    const { viajeId } = req.query;
    const whereH  = viajeId ? 'WHERE viaje_id = ?' : '';
    const whereHh = viajeId ? 'WHERE h.viaje_id = ?' : '';
    const p1 = viajeId ? [Number(viajeId)] : [];
    const p2 = viajeId ? [Number(viajeId)] : [];

    // Dos subqueries para evitar la multiplicación de SUM(h.total) por el JOIN
    const [rows] = await pool.query(`
      SELECT
        et.etiqueta,
        et.habitaciones,
        et.total_por_cobrar,
        COALESCE(pag.personas,     0) AS personas,
        COALESCE(pag.total_pagado, 0) AS total_pagado
      FROM (
        SELECT
          COALESCE(NULLIF(etiqueta,''), 'Sin etiqueta') AS etiqueta,
          COUNT(id)  AS habitaciones,
          SUM(total) AS total_por_cobrar
        FROM habitaciones
        ${whereH}
        GROUP BY COALESCE(NULLIF(etiqueta,''), 'Sin etiqueta')
      ) et
      LEFT JOIN (
        SELECT
          COALESCE(NULLIF(h.etiqueta,''), 'Sin etiqueta') AS etiqueta,
          COUNT(DISTINCT pers.id)          AS personas,
          COALESCE(SUM(p.monto), 0)        AS total_pagado
        FROM habitaciones h
        LEFT JOIN personas pers ON pers.habitacion_id = h.id
        LEFT JOIN pagos    p    ON p.persona_id       = pers.id
        ${whereHh}
        GROUP BY COALESCE(NULLIF(h.etiqueta,''), 'Sin etiqueta')
      ) pag ON pag.etiqueta = et.etiqueta
      ORDER BY et.total_por_cobrar DESC
    `, [...p1, ...p2]);

    res.json(rows.map(r => ({
      etiqueta: r.etiqueta,
      habitaciones: Number(r.habitaciones),
      personas:     Number(r.personas),
      total_por_cobrar: Number(r.total_por_cobrar),
      total_pagado:     Number(r.total_pagado),
      pendiente: Number(r.total_por_cobrar) - Number(r.total_pagado),
      porcentaje: r.total_por_cobrar > 0
        ? ((Number(r.total_pagado) / Number(r.total_por_cobrar)) * 100).toFixed(1)
        : 0,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── REPORTE: COMPARATIVA ENTRE VIAJES ──────────────────────────────────────
// GET /api/stats/reportes/comparativa-viajes
router.get('/reportes/comparativa-viajes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        v.id,
        v.nombre,
        COALESCE(v.tipo,'resort') as tipo,
        v.fecha_inicio,
        COALESCE((SELECT SUM(h.total) FROM habitaciones h WHERE h.viaje_id = v.id), 0) as total_por_cobrar,
        COALESCE((
          SELECT SUM(p.monto)
          FROM pagos p
          JOIN personas pers ON p.persona_id = pers.id
          JOIN habitaciones h ON pers.habitacion_id = h.id
          WHERE h.viaje_id = v.id
        ), 0) as total_pagado,
        COALESCE((SELECT COUNT(*) FROM habitaciones h WHERE h.viaje_id = v.id), 0) as habitaciones,
        COALESCE((
          SELECT COUNT(DISTINCT pers.id)
          FROM personas pers
          JOIN habitaciones h ON pers.habitacion_id = h.id
          WHERE h.viaje_id = v.id
        ), 0) as personas
      FROM viajes v
      ORDER BY v.id DESC
    `);

    res.json(rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      fecha_inicio: r.fecha_inicio,
      total_por_cobrar: Number(r.total_por_cobrar),
      total_pagado: Number(r.total_pagado),
      pendiente: Number(r.total_por_cobrar) - Number(r.total_pagado),
      habitaciones: Number(r.habitaciones),
      personas: Number(r.personas),
      porcentaje: r.total_por_cobrar > 0
        ? ((Number(r.total_pagado) / Number(r.total_por_cobrar)) * 100).toFixed(1)
        : 0,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── REPORTE: PAGOS POR MES × VIAJE (para heatmap/tabla cruzada) ────────────
// GET /api/stats/reportes/pagos-mes-viaje
router.get('/reportes/pagos-mes-viaje', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        v.id   as viaje_id,
        v.nombre as viaje_nombre,
        p.mes,
        SUM(p.monto) as total
      FROM pagos p
      JOIN personas pers ON p.persona_id = pers.id
      JOIN habitaciones h ON pers.habitacion_id = h.id
      JOIN viajes v ON h.viaje_id = v.id
      GROUP BY v.id, v.nombre, p.mes
      ORDER BY v.id, FIELD(p.mes,
        'Ene','Feb','Mar','Abr','May','Jun',
        'Jul','Ago','Sep','Oct','Nov','Dic'
      )
    `);

    res.json(rows.map(r => ({ ...r, total: Number(r.total) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── RUTAS EXISTENTES ────────────────────────────────────────────────────────

router.get('/viaje/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, tipo, fecha_inicio, fecha_fin, nota, slug FROM viajes WHERE slug = ?',
      [slug]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/viajes/with-slug', async (req, res) => {
  const { nombre, fechaInicio, fechaFin, nota, tipo = 'resort', divisa = 'USD', edadMinimaPago = 0 } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre del viaje es requerido.' });

  try {
    // Asegurar columna (safe migration)
    try {
      await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS edad_minima_pago INT NOT NULL DEFAULT 0`);
    } catch (_) {}

    let slug = nombre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const [existing] = await pool.query('SELECT id FROM viajes WHERE slug = ?', [slug]);
    if (existing.length > 0) slug = `${slug}-${Date.now()}`;

    const [result] = await pool.query(
      'INSERT INTO viajes (nombre, fecha_inicio, fecha_fin, nota, tipo, divisa, slug, edad_minima_pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, fechaInicio || null, fechaFin || null, nota || null, tipo, divisa, slug, Number(edadMinimaPago) || 0]
    );

    res.status(201).json({ id: result.insertId, nombre, fechaInicio, fechaFin, nota, tipo, divisa, slug, edadMinimaPago: Number(edadMinimaPago) || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;