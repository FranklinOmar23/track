import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Estadísticas globales para el dashboard
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Solicitando estadísticas del dashboard...');
    
    // 1. Total de viajes por tipo
    const [viajesPorTipo] = await pool.query(`
      SELECT 
        tipo,
        COUNT(*) as total
      FROM viajes
      GROUP BY tipo
    `);
    
    console.log('Viajes por tipo:', viajesPorTipo);

    // 2. Estadísticas completas por viaje
    const [statsViajes] = await pool.query(`
      SELECT 
        v.id,
        v.nombre,
        COALESCE(v.tipo, 'resort') as tipo,
        v.slug,
        v.fecha_inicio,
        v.fecha_fin,
        COALESCE(SUM(h.total), 0) as total_por_cobrar,
        COALESCE(SUM(p.monto), 0) as total_pagado,
        COALESCE(SUM(h.total) - SUM(p.monto), 0) as pendiente,
        COUNT(DISTINCT h.id) as total_habitaciones,
        COUNT(DISTINCT pers.id) as total_personas
      FROM viajes v
      LEFT JOIN habitaciones h ON h.viaje_id = v.id
      LEFT JOIN personas pers ON pers.habitacion_id = h.id
      LEFT JOIN pagos p ON p.persona_id = pers.id
      GROUP BY v.id
      ORDER BY v.id DESC
    `);
    
    console.log('Estadísticas por viaje:', statsViajes.length, 'viajes encontrados');

    // 3. Resumen global
    const totalGlobalPorCobrar = statsViajes.reduce((sum, v) => sum + Number(v.total_por_cobrar), 0);
    const totalGlobalPagado = statsViajes.reduce((sum, v) => sum + Number(v.total_pagado), 0);
    
    const response = {
      resumen: {
        total_viajes: statsViajes.length,
        total_resorts: viajesPorTipo.find(t => t.tipo === 'resort')?.total || 0,
        total_tours: viajesPorTipo.find(t => t.tipo === 'tour')?.total || 0,
        total_por_cobrar: totalGlobalPorCobrar,
        total_pagado: totalGlobalPagado,
        total_pendiente: totalGlobalPorCobrar - totalGlobalPagado,
        porcentaje_pagado: totalGlobalPorCobrar > 0 ? (totalGlobalPagado / totalGlobalPorCobrar * 100).toFixed(1) : 0
      },
      viajes: statsViajes.map(v => ({
        ...v,
        total_por_cobrar: Number(v.total_por_cobrar),
        total_pagado: Number(v.total_pagado),
        pendiente: Number(v.pendiente),
        total_habitaciones: Number(v.total_habitaciones),
        total_personas: Number(v.total_personas)
      }))
    };
    
    console.log('Respuesta enviada correctamente');
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