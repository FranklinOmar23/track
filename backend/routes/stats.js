import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { registrarLog } from '../utils/log.js';
import { normalizarGanancia } from '../utils/ganancia.js';
import { consultarHabitaciones } from './habitaciones.js';
import { requierePermiso, filtrarPorViaje, viajesPermitidos, rechazarSinAcceso, darAccesoAViajeNuevo } from '../utils/permisos.js';
import { calcularGananciasPorViaje } from '../utils/gananciaReporte.js';
import { cargarHabitacionesPorViaje, sumarResumenes, redondear } from '../utils/totales.js';

const router = asyncRouter();

const SQL_VIAJES = `
  SELECT id, nombre, COALESCE(tipo, 'resort') AS tipo, COALESCE(divisa, 'USD') AS divisa, slug,
         COALESCE(estado, 'activo') AS estado, fecha_inicio, fecha_fin,
         COALESCE(edad_minima_pago, 0) AS edad_minima_pago,
         COALESCE(ganancia_tipo, 'ninguna') AS ganancia_tipo,
         COALESCE(ganancia_valor, 0) AS ganancia_valor
  FROM viajes
  ORDER BY id DESC`;

/** Viajes y habitaciones (con lo pagado) en paralelo: una sola espera en lugar de dos. */
const cargarViajesYHabitaciones = async () => {
  const [[viajes], habsPorViaje] = await Promise.all([pool.query(SQL_VIAJES), cargarHabitacionesPorViaje(pool)]);
  return [viajes, habsPorViaje];
};

// ─── DASHBOARD EXISTENTE ────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  const [viajes, habsPorViaje] = await cargarViajesYHabitaciones();

  const viajesConTotales = filtrarPorViaje(req.auth, viajes).map((v) => {
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
router.get('/reportes/pagos-por-mes', requierePermiso('reportes'), async (req, res) => {
  try {
    const { viajeId } = req.query;
    if (rechazarSinAcceso(req, res, viajeId)) return;
    const params = [];
    const permitidos = viajesPermitidos(req.auth);
    let whereViaje = '';
    if (viajeId) { whereViaje = 'AND h.viaje_id = ?'; params.push(Number(viajeId)); }
    else if (permitidos) { whereViaje = 'AND h.viaje_id IN (?)'; params.push(permitidos.length ? permitidos : [0]); }

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
router.get('/reportes/por-etiqueta', requierePermiso('reportes'), async (req, res) => {
  const { viajeId } = req.query;
  if (rechazarSinAcceso(req, res, viajeId)) return;
  // Las dos consultas son independientes: en paralelo
  const [[viajes], habsPorViaje] = await Promise.all([
    pool.query(
      `SELECT id, COALESCE(edad_minima_pago, 0) AS edad_minima_pago FROM viajes${viajeId ? ' WHERE id = ?' : ''}`,
      viajeId ? [Number(viajeId)] : []
    ),
    cargarHabitacionesPorViaje(pool, viajeId || null),
  ]);

  const porEtiqueta = new Map();
  filtrarPorViaje(req.auth, viajes).forEach((v) => {
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
router.get('/reportes/comparativa-viajes', requierePermiso('reportes'), async (req, res) => {
  const [viajes, habsPorViaje] = await cargarViajesYHabitaciones();

  res.json(filtrarPorViaje(req.auth, viajes).map((v) => {
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
router.get('/reportes/pagos-mes-viaje', requierePermiso('reportes'), async (req, res) => {
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

    res.json(filtrarPorViaje(req.auth, rows, 'viaje_id').map(r => ({ ...r, anio: Number(r.anio), total: Number(r.total) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── REPORTE: GANANCIAS POR VIAJE ────────────────────────────────────────────
// GET /api/stats/reportes/ganancias
router.get('/reportes/ganancias', requierePermiso('reportes'), async (req, res) => {
  const [viajes, habsPorViaje] = await cargarViajesYHabitaciones();
  res.json(calcularGananciasPorViaje(filtrarPorViaje(req.auth, viajes), habsPorViaje));
});

// ─── REPORTE: PAGOS DETALLADOS (libro de caja, último pago por persona) ─────
// GET /api/stats/reportes/pagos?viajeId=&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/reportes/pagos', requierePermiso('reportes'), async (req, res) => {
  if (rechazarSinAcceso(req, res, req.query.viajeId)) return;
  const where = [];
  const params = [];
  const permitidos = viajesPermitidos(req.auth);
  if (req.query.viajeId) { where.push('h.viaje_id = ?'); params.push(Number(req.query.viajeId)); }
  else if (permitidos) { where.push('h.viaje_id IN (?)'); params.push(permitidos.length ? permitidos : [0]); }
  if (req.query.desde) { where.push('pg.created_at >= ?'); params.push(`${req.query.desde} 00:00:00`); }
  if (req.query.hasta) { where.push('pg.created_at <= ?'); params.push(`${req.query.hasta} 23:59:59`); }

  const [rows] = await pool.query(`
    SELECT pg.id, pg.monto, pg.mes, COALESCE(pg.anio, YEAR(pg.created_at)) AS anio, pg.created_at AS fecha,
           p.id AS persona_id, p.nombre AS persona, h.id AS habitacion_id, h.numero AS habitacion,
           COALESCE(NULLIF(h.etiqueta, ''), 'Sin etiqueta') AS etiqueta,
           v.id AS viaje_id, v.nombre AS viaje, COALESCE(v.divisa, 'USD') AS divisa,
           (SELECT l.usuario FROM logs_actividad l
             WHERE l.entidad = 'pago' AND l.accion = 'pago' AND l.entidad_id = pg.id
             ORDER BY l.id LIMIT 1) AS registrado_por
    FROM pagos pg
    JOIN personas p ON p.id = pg.persona_id
    JOIN habitaciones h ON h.id = p.habitacion_id
    JOIN viajes v ON v.id = h.viaje_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY pg.created_at DESC, pg.id DESC
  `, params);

  res.json(rows.map((r) => ({ ...r, monto: Number(r.monto), anio: Number(r.anio) })));
});

// ─── REPORTE: MOVIMIENTOS ENTRE HABITACIONES ───────────────────────────────
// GET /api/stats/reportes/movimientos?viajeId=
router.get('/reportes/movimientos', requierePermiso('reportes'), async (req, res) => {
  if (rechazarSinAcceso(req, res, req.query.viajeId)) return;
  const params = [];
  let where = '';
  if (req.query.viajeId) { where = 'WHERE (ho.viaje_id = ? OR hd.viaje_id = ?)'; params.push(Number(req.query.viajeId), Number(req.query.viajeId)); }
  const [rows] = await pool.query(`
    SELECT m.id, m.fecha_movimiento AS fecha, p.nombre AS persona,
           ho.numero AS origen, hd.numero AS destino, v.id AS viaje_id, v.nombre AS viaje,
           (SELECT l.usuario FROM logs_actividad l
             WHERE l.accion = 'mover' AND l.entidad_id = m.persona_id
               AND l.fecha BETWEEN m.fecha_movimiento - INTERVAL 1 MINUTE AND m.fecha_movimiento + INTERVAL 1 MINUTE
             ORDER BY l.id LIMIT 1) AS usuario
    FROM historial_movimientos m
    JOIN personas p ON p.id = m.persona_id
    LEFT JOIN habitaciones ho ON ho.id = m.habitacion_origen_id
    LEFT JOIN habitaciones hd ON hd.id = m.habitacion_destino_id
    LEFT JOIN viajes v ON v.id = COALESCE(hd.viaje_id, ho.viaje_id)
    ${where}
    ORDER BY m.fecha_movimiento DESC
  `, params);
  res.json(filtrarPorViaje(req.auth, rows, 'viaje_id'));
});

// ─── RUTAS EXISTENTES ────────────────────────────────────────────────────────

router.get('/viaje/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    // Con ?habitaciones=1 devuelve también las habitaciones, en paralelo: abrir un viaje = una sola petición
    const incluirHabitaciones = req.query.habitaciones === '1';
    const [[rows], habitaciones] = await Promise.all([
      pool.query(
        `SELECT id, nombre, tipo, fecha_inicio, fecha_fin, nota, slug, COALESCE(estado, 'activo') AS estado FROM viajes WHERE slug = ?`,
        [slug]
      ),
      incluirHabitaciones ? consultarHabitaciones({ slug }) : null,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (rechazarSinAcceso(req, res, rows[0].id)) return;
    res.json(incluirHabitaciones ? { ...rows[0], habitaciones } : rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/viajes/with-slug', requierePermiso('crear_viajes'), async (req, res) => {
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

    await darAccesoAViajeNuevo(req, result.insertId);
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