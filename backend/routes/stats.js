import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Estadísticas globales para el dashboard
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Solicitando estadísticas del dashboard...');

    // 1. Total de viajes por tipo
    const [viajesPorTipo] = await pool.query(`
      SELECT tipo, COUNT(*) as total FROM viajes GROUP BY tipo
    `);

    // 2. Estadísticas correctas por viaje usando subconsultas
    const [statsViajes] = await pool.query(`
      SELECT 
        v.id,
        v.nombre,
        COALESCE(v.tipo, 'resort') as tipo,
        v.slug,
        v.fecha_inicio,
        v.fecha_fin,
        COALESCE(
          (SELECT SUM(h.total) FROM habitaciones h WHERE h.viaje_id = v.id),
          0
        ) as total_por_cobrar,
        COALESCE(
          (SELECT SUM(p.monto) 
           FROM pagos p 
           JOIN personas pers ON p.persona_id = pers.id
           JOIN habitaciones h ON pers.habitacion_id = h.id
           WHERE h.viaje_id = v.id),
          0
        ) as total_pagado,
        COALESCE(
          (SELECT COUNT(DISTINCT h.id) FROM habitaciones h WHERE h.viaje_id = v.id),
          0
        ) as total_habitaciones,
        COALESCE(
          (SELECT COUNT(DISTINCT pers.id) 
           FROM personas pers 
           JOIN habitaciones h ON pers.habitacion_id = h.id 
           WHERE h.viaje_id = v.id),
          0
        ) as total_personas
      FROM viajes v
      ORDER BY v.id DESC
    `);

    // Calcular pendiente y porcentaje
    const viajesConPendiente = statsViajes.map(v => ({
      ...v,
      total_por_cobrar: Number(v.total_por_cobrar),
      total_pagado: Number(v.total_pagado),
      pendiente: Number(v.total_por_cobrar) - Number(v.total_pagado),
      total_habitaciones: Number(v.total_habitaciones),
      total_personas: Number(v.total_personas)
    }));

    const totalGlobalPorCobrar = viajesConPendiente.reduce((sum, v) => sum + v.total_por_cobrar, 0);
    const totalGlobalPagado = viajesConPendiente.reduce((sum, v) => sum + v.total_pagado, 0);

    const response = {
      resumen: {
        total_viajes: viajesConPendiente.length,
        total_resorts: viajesConPendiente.filter(v => v.tipo === 'resort').length,
        total_tours: viajesConPendiente.filter(v => v.tipo === 'tour').length,
        total_por_cobrar: totalGlobalPorCobrar,
        total_pagado: totalGlobalPagado,
        total_pendiente: totalGlobalPorCobrar - totalGlobalPagado,
        porcentaje_pagado: totalGlobalPorCobrar > 0 
          ? ((totalGlobalPagado / totalGlobalPorCobrar) * 100).toFixed(1) 
          : 0
      },
      viajes: viajesConPendiente
    };

    console.log('✅ Respuesta corregida:', response.resumen);
    res.json(response);
  } catch (error) {
    console.error('Error en dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener viaje por slug (para rutas dinámicas)
router.get('/viaje/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, tipo, fecha_inicio, fecha_fin, nota, slug FROM viajes WHERE slug = ?',
      [slug]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error obteniendo viaje por slug:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generar slug automáticamente al crear viaje
router.post('/viajes/with-slug', async (req, res) => {
  const { nombre, fechaInicio, fechaFin, nota, tipo = 'resort' } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'Nombre del viaje es requerido.' });
  }
  
  try {
    // Generar slug único
    let slug = nombre.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Verificar si el slug ya existe
    const [existing] = await pool.query('SELECT id FROM viajes WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }
    
    const [result] = await pool.query(
      'INSERT INTO viajes (nombre, fecha_inicio, fecha_fin, nota, tipo, slug) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, fechaInicio || null, fechaFin || null, nota || null, tipo, slug]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      nombre, 
      fechaInicio, 
      fechaFin, 
      nota,
      tipo,
      slug
    });
  } catch (error) {
    console.error('Error creando viaje con slug:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;