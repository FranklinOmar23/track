import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { registrarLog } from '../utils/log.js';
import { normalizarGanancia } from '../utils/ganancia.js';
import { calcularGananciasPorViaje } from '../utils/gananciaReporte.js';
import { cargarHabitacionesPorViaje, sumarResumenes, redondear } from '../utils/totales.js';

const router = asyncRouter();

// ─── DASHBOARD EXISTENTE ────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  const [viajes] = await pool.query(`
    SELECT id, nombre, COALESCE(tipo, 'resort') AS tipo, COALESCE(divisa, 'USD') AS divisa, slug,
           COALESCE(estado, 'activo') AS estado, fecha_inicio, fecha_fin,
           COALESCE(edad_minima_pago, 0) AS edad_minima_pago,
           COALESCE(ganancia_tipo, 'ninguna') AS ganancia_tipo,
           COALESCE(ganancia_valor, 0) AS ganancia_valor
    FROM viajes
    ORDER BY id DESC
  `);
  const habsPorViaje = await cargarHabitacionesPorViaje(pool);

  const viajesConTotales = viajes.map((v) => {
    const r = sumarResumenes(habsPorViaje.get(v.id) || [], v.edad_minima_pago);
    return {
      ...v,
      ganancia_valor: Number(v.ganancia_valor) || 0,
      total_por_cobrar: redondear(r.totalPorCobrar),
      total_pagado: redondear(r.pagado),
      pendiente: redondear(Math.max(0, r.totalPorCobrar - r.pagado)),
      total_habitaciones: r.habitaciones,
      total_personas: r.personas,
      personas_pagan: r.pax,
    };
  });

  const totalGlobalPorCobrar = viajesConTotales.reduce((s, v) => s + v.total_por_cobrar, 0);
  const totalGlobalPagado    = viajesConTotales.reduce((s, v) => s + v.total_pagado, 0);

  res.json({
    resumen: {
      total_viajes: viajesConTotales.length,
      total_resorts: viajesConTotales.filter((v) => v.tipo === 'resort').length,
      total_tours:   viajesConTotales.filter((v) => v.tipo === 'tour').length,
      total_por_cobrar: totalGlobalPorCobrar,
      total_pagado:     totalGlobalPagado,
      total_pendiente:  Math.max(0, totalGlobalPorCobrar - totalGlobalPagado),
      porcentaje_pagado: totalGlobalPorCobrar > 0
        ? ((totalGlobalPagado / totalGlobalPorCobrar) * 100).toFixed(1)
        : 0,
    },
    viajes: viajesConTotales,
  });
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
        COALESCE(p.anio, YEAR(p.created_at)) AS anio,
        p.mes,
        SUM(p.monto) as total,
        COUNT(p.id)  as cantidad_pagos
      FROM pagos p
      JOIN personas pers ON p.persona_id = pers.id
      JOIN habitaciones h ON pers.habitacion_id = h.id
      WHERE 1=1 ${whereViaje}
      GROUP BY anio, p.mes
      ORDER BY anio, FIELD(p.mes,
        'Ene','Feb','Mar','Abr','May','Jun',
        'Jul','Ago','Sep','Oct','Nov','Dic'
      )
    `, params);

    res.json(rows.map(r => ({
      anio: Number(r.anio),
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
  const { viajeId } = req.query;
  const [viajes] = await pool.query(
    `SELECT id, COALESCE(edad_minima_pago, 0) AS edad_minima_pago FROM viajes${viajeId ? ' WHERE id = ?' : ''}`,
    viajeId ? [Number(viajeId)] : []
  );
  const habsPorViaje = await cargarHabitacionesPorViaje(pool, viajeId || null);

  const porEtiqueta = new Map();
  viajes.forEach((v) => {
    (habsPorViaje.get(v.id) || []).forEach((h) => {
      const etiqueta = h.etiqueta || 'Sin etiqueta';
      if (!porEtiqueta.has(etiqueta)) porEtiqueta.set(etiqueta, { etiqueta, habs: [], edad: v.edad_minima_pago });
      porEtiqueta.get(etiqueta).habs.push({ h, edad: v.edad_minima_pago });
    });
  });

  const filas = [...porEtiqueta.values()].map(({ etiqueta, habs }) => {
    const r = habs.reduce((acc, { h, edad }) => {
      const x = sumarResumenes([h], edad);
      acc.totalPorCobrar += x.totalPorCobrar; acc.pagado += x.pagado; acc.personas += x.personas;
      return acc;
    }, { totalPorCobrar: 0, pagado: 0, personas: 0 });
    return {
      etiqueta,
      habitaciones: habs.length,
      personas: r.personas,
      total_por_cobrar: redondear(r.totalPorCobrar),
      total_pagado: redondear(r.pagado),
      pendiente: redondear(Math.max(0, r.totalPorCobrar - r.pagado)),
      porcentaje: r.totalPorCobrar > 0 ? ((r.pagado / r.totalPorCobrar) * 100).toFixed(1) : 0,
    };
  });

  res.json(filas.sort((a, b) => b.total_por_cobrar - a.total_por_cobrar));
});

// ─── REPORTE: COMPARATIVA ENTRE VIAJES ──────────────────────────────────────
// GET /api/stats/reportes/comparativa-viajes
router.get('/reportes/comparativa-viajes', async (req, res) => {
  const [viajes] = await pool.query(`
    SELECT id, nombre, COALESCE(tipo, 'resort') AS tipo, COALESCE(divisa, 'USD') AS divisa, slug,
           COALESCE(estado, 'activo') AS estado, fecha_inicio, fecha_fin,
           COALESCE(edad_minima_pago, 0) AS edad_minima_pago,
           COALESCE(ganancia_tipo, 'ninguna') AS ganancia_tipo,
           COALESCE(ganancia_valor, 0) AS ganancia_valor
    FROM viajes
    ORDER BY id DESC
  `);
  const habsPorViaje = await cargarHabitacionesPorViaje(pool);

  res.json(viajes.map((v) => {
    const r = sumarResumenes(habsPorViaje.get(v.id) || [], v.edad_minima_pago);
    return {
      id: v.id,
      nombre: v.nombre,
      tipo: v.tipo,
      fecha_inicio: v.fecha_inicio,
      total_por_cobrar: redondear(r.totalPorCobrar),
      total_pagado: redondear(r.pagado),
      pendiente: redondear(Math.max(0, r.totalPorCobrar - r.pagado)),
      habitaciones: r.habitaciones,
      personas: r.personas,
      porcentaje: r.totalPorCobrar > 0 ? ((r.pagado / r.totalPorCobrar) * 100).toFixed(1) : 0,
    };
  }));
});

// ─── REPORTE: PAGOS POR MES × VIAJE (para heatmap/tabla cruzada) ────────────
// GET /api/stats/reportes/pagos-mes-viaje
router.get('/reportes/pagos-mes-viaje', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        v.id   as viaje_id,
        v.nombre as viaje_nombre,
        COALESCE(p.anio, YEAR(p.created_at)) AS anio,
        p.mes,
        SUM(p.monto) as total
      FROM pagos p
      JOIN personas pers ON p.persona_id = pers.id
      JOIN habitaciones h ON pers.habitacion_id = h.id
      JOIN viajes v ON h.viaje_id = v.id
      GROUP BY v.id, v.nombre, anio, p.mes
      ORDER BY v.id, anio, FIELD(p.mes,
        'Ene','Feb','Mar','Abr','May','Jun',
        'Jul','Ago','Sep','Oct','Nov','Dic'
      )
    `);

    res.json(rows.map(r => ({ ...r, anio: Number(r.anio), total: Number(r.total) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── REPORTE: GANANCIAS POR VIAJE ────────────────────────────────────────────
// GET /api/stats/reportes/ganancias
router.get('/reportes/ganancias', async (req, res) => {
  const [viajes] = await pool.query(`
    SELECT id, nombre, COALESCE(tipo, 'resort') AS tipo, COALESCE(divisa, 'USD') AS divisa, slug,
           COALESCE(estado, 'activo') AS estado, fecha_inicio, fecha_fin,
           COALESCE(edad_minima_pago, 0) AS edad_minima_pago,
           COALESCE(ganancia_tipo, 'ninguna') AS ganancia_tipo,
           COALESCE(ganancia_valor, 0) AS ganancia_valor
    FROM viajes
    ORDER BY id DESC
  `);
  const habsPorViaje = await cargarHabitacionesPorViaje(pool);
  res.json(calcularGananciasPorViaje(viajes, habsPorViaje));
});

// ─── RUTAS EXISTENTES ────────────────────────────────────────────────────────

router.get('/viaje/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, tipo, fecha_inicio, fecha_fin, nota, slug, COALESCE(estado, 'activo') AS estado FROM viajes WHERE slug = ?`,
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
  const { gananciaTipo, gananciaValor } = normalizarGanancia(req.body);
  if (!nombre) return res.status(400).json({ error: 'Nombre del viaje es requerido.' });

  try {
    let slug = nombre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const [existing] = await pool.query('SELECT id FROM viajes WHERE slug = ?', [slug]);
    if (existing.length > 0) slug = `${slug}-${Date.now()}`;

    const [result] = await pool.query(
      `INSERT INTO viajes (nombre, fecha_inicio, fecha_fin, nota, tipo, divisa, slug, edad_minima_pago, ganancia_tipo, ganancia_valor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, fechaInicio || null, fechaFin || null, nota || null, tipo, divisa, slug, Number(edadMinimaPago) || 0, gananciaTipo, gananciaValor]
    );

    registrarLog(req.usuario, 'crear', 'viaje', result.insertId, `${req.usuario} creó el viaje "${nombre}"`);

    res.status(201).json({
      id: result.insertId, nombre, fechaInicio, fechaFin, nota, tipo, divisa, slug,
      edadMinimaPago: Number(edadMinimaPago) || 0, gananciaTipo, gananciaValor, estado: 'activo', cerradoAt: null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;