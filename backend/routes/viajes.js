import { Router } from 'express';
import pool from '../db.js';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nombre, COALESCE(tipo, 'resort') as tipo, 
     COALESCE(divisa, 'USD') as divisa,
     fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, nota, slug 
     FROM viajes ORDER BY id DESC`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, fechaInicio, fechaFin, nota, tipo = 'resort', divisa = 'USD' } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre del viaje es requerido.' });
  }

  const [result] = await pool.query(
    'INSERT INTO viajes (nombre, fecha_inicio, fecha_fin, nota, tipo, divisa) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, fechaInicio || null, fechaFin || null, nota || null, tipo, divisa]
  );

  res.status(201).json({ id: result.insertId, nombre, fechaInicio, fechaFin, nota, tipo, divisa });
});

// ← NUEVO: editar viaje
router.put('/:id', async (req, res) => {
  const viajeId = Number(req.params.id);
  const { nombre, fechaInicio, fechaFin, nota, tipo, divisa } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es requerido.' });
  }

  await pool.query(
    `UPDATE viajes SET 
      nombre = ?, 
      fecha_inicio = ?, 
      fecha_fin = ?, 
      nota = ?, 
      tipo = ?,
      divisa = ?
     WHERE id = ?`,
    [nombre, fechaInicio || null, fechaFin || null, nota || null, tipo || 'resort', divisa || 'USD', viajeId]
  );

  res.json({ id: viajeId, nombre, fechaInicio, fechaFin, nota, tipo, divisa });
});

// ← NUEVO: eliminar viaje
router.delete('/:id', async (req, res) => {
  const viajeId = Number(req.params.id);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Eliminar pagos de personas de habitaciones del viaje
    await connection.query(`
      DELETE p FROM pagos p
      JOIN personas pers ON p.persona_id = pers.id
      JOIN habitaciones h ON pers.habitacion_id = h.id
      WHERE h.viaje_id = ?
    `, [viajeId]);

    // Eliminar personas
    await connection.query(`
      DELETE pers FROM personas pers
      JOIN habitaciones h ON pers.habitacion_id = h.id
      WHERE h.viaje_id = ?
    `, [viajeId]);

    // Eliminar habitaciones
    await connection.query('DELETE FROM habitaciones WHERE viaje_id = ?', [viajeId]);

    // Eliminar viaje
    await connection.query('DELETE FROM viajes WHERE id = ?', [viajeId]);

    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/default', async (req, res) => {
  const defaultNombre = 'Resort MamaTingo';
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [viajes] = await connection.query(
      `SELECT id, nombre, COALESCE(tipo,'resort') as tipo, COALESCE(divisa,'USD') as divisa,
       fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, nota 
       FROM viajes WHERE nombre = ? LIMIT 1`,
      [defaultNombre]
    );

    let viaje;

    if (viajes.length > 0) {
      viaje = viajes[0];
    } else {
      const [result] = await connection.query(
        'INSERT INTO viajes (nombre, nota, tipo, divisa) VALUES (?, ?, ?, ?)',
        [defaultNombre, 'Viaje predeterminado para pagos existentes', 'resort', 'USD']
      );
      viaje = {
        id: result.insertId,
        nombre: defaultNombre,
        tipo: 'resort',
        divisa: 'USD',
        fechaInicio: null,
        fechaFin: null,
        nota: 'Viaje predeterminado para pagos existentes',
      };
    }

    await connection.query('UPDATE habitaciones SET viaje_id = ? WHERE viaje_id IS NULL', [viaje.id]);
    await connection.commit();
    res.status(200).json(viaje);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Generar token de compartir con expiración
router.post('/:id/compartir', async (req, res) => {
  const viajeId = Number(req.params.id);
  const { duracion } = req.body; // '1h', '7h', '24h', '7d', 'never'
  
  try {
    // Calcular fecha de expiración
    let expiraCompartir = null;
    const ahora = new Date();
    
    switch (duracion) {
      case '1h':
        expiraCompartir = new Date(ahora.getTime() + 60 * 60 * 1000);
        break;
      case '7h':
        expiraCompartir = new Date(ahora.getTime() + 7 * 60 * 60 * 1000);
        break;
      case '24h':
        expiraCompartir = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '7d':
        expiraCompartir = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'never':
      default:
        expiraCompartir = null;
        break;
    }
    
    // ✅ USAR crypto del import (NO require)
    const token = crypto.randomBytes(32).toString('hex');
    
    // Asegurar que las columnas existen
    try {
      await pool.query(`
        ALTER TABLE viajes 
        ADD COLUMN IF NOT EXISTS token_compartir VARCHAR(100),
        ADD COLUMN IF NOT EXISTS compartir_activo TINYINT(1) DEFAULT 1,
        ADD COLUMN IF NOT EXISTS expira_compartir DATETIME NULL
      `);
    } catch (err) {
      console.log('Nota:', err.message);
    }
    
    await pool.query(
      `UPDATE viajes 
       SET token_compartir = ?, 
           compartir_activo = 1,
           expira_compartir = ?
       WHERE id = ?`,
      [token, expiraCompartir, viajeId]
    );
    
    const baseUrl = process.env.FRONTEND_URL || 'https://pagos.sadojtours.com';
    const linkCompartir = `${baseUrl}/viaje-compartido/${token}`;
    
    let expiracionTexto = 'Sin expiración';
    if (expiraCompartir) {
      expiracionTexto = new Intl.DateTimeFormat('es-DO', {
        dateStyle: 'full',
        timeStyle: 'short'
      }).format(expiraCompartir);
    }
    
    res.json({ 
      ok: true, 
      token, 
      linkCompartir,
      expiraCompartir: expiraCompartir?.toISOString(),
      expiracionTexto,
      mensaje: 'Link generado correctamente'
    });
  } catch (error) {
    console.error('Error generando link:', error);
    res.status(500).json({ error: error.message });
  }
});
// Obtener viaje por token (vista pública) - VERIFICAR EXPIRACIÓN
router.get('/publico/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const [viajes] = await pool.query(
      `SELECT id, nombre, tipo, fecha_inicio, fecha_fin, nota, slug, 
              expira_compartir, compartir_activo
       FROM viajes 
       WHERE token_compartir = ? AND compartir_activo = 1`,
      [token]
    );
    
    if (viajes.length === 0) {
      return res.status(404).json({ error: 'Link inválido o desactivado' });
    }
    
    const viaje = viajes[0];
    
    // Verificar expiración
    if (viaje.expira_compartir) {
      const fechaExpiracion = new Date(viaje.expira_compartir);
      const ahora = new Date();
      
      if (ahora > fechaExpiracion) {
        return res.status(410).json({ 
          error: 'expired',
          mensaje: 'Este enlace ha expirado',
          expiracion: viaje.expira_compartir
        });
      }
    }
    
    const viajeId = viaje.id;
    
    // Obtener habitaciones con personas y pagos
    const [habitaciones] = await pool.query(`
      SELECT 
        h.id, h.numero, h.tipo, h.total, h.precio_nino, h.es_stack, h.nota, h.etiqueta,
        p.id as persona_id, p.nombre as persona_nombre, p.posicion, p.es_nino,
        pag.id as pago_id, pag.mes, pag.monto
      FROM habitaciones h
      LEFT JOIN personas p ON p.habitacion_id = h.id
      LEFT JOIN pagos pag ON pag.persona_id = p.id
      WHERE h.viaje_id = ?
      ORDER BY h.etiqueta, CAST(h.numero AS UNSIGNED), p.posicion
    `, [viajeId]);
    
    // Agrupar por habitación
    const habitacionesMap = new Map();
    habitaciones.forEach(row => {
      if (!habitacionesMap.has(row.id)) {
        habitacionesMap.set(row.id, {
          id: row.id,
          num: row.numero,
          tipo: row.tipo,
          total: Number(row.total),
          precioNino: Number(row.precio_nino),
          stack: !!row.es_stack,
          nota: row.nota || '',
          etiqueta: row.etiqueta || '',
          personas: []
        });
      }
      
      const hab = habitacionesMap.get(row.id);
      if (row.persona_id) {
        let persona = hab.personas.find(p => p.id === row.persona_id);
        if (!persona) {
          persona = {
            id: row.persona_id,
            n: row.persona_nombre,
            posicion: row.posicion,
            esNino: !!row.es_nino,
            pagos: []
          };
          hab.personas.push(persona);
        }
        if (row.pago_id) {
          persona.pagos.push({
            id: row.pago_id,
            mes: row.mes,
            monto: Number(row.monto)
          });
        }
      }
    });
    
    res.json({
      viaje: {
        id: viaje.id,
        nombre: viaje.nombre,
        tipo: viaje.tipo,
        expiraCompartir: viaje.expira_compartir
      },
      habitaciones: Array.from(habitacionesMap.values())
    });
  } catch (error) {
    console.error('Error obteniendo viaje público:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;