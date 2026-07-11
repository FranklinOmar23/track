import { Router } from 'express';
import pool from '../db.js';
import crypto from 'crypto';
import { registrarLog } from '../utils/log.js';

const router = Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nombre, COALESCE(tipo, 'resort') as tipo,
     COALESCE(divisa, 'USD') as divisa,
     fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, nota, slug,
     COALESCE(edad_minima_pago, 0) AS edadMinimaPago
     FROM viajes ORDER BY id DESC`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, fechaInicio, fechaFin, nota, tipo = 'resort', divisa = 'USD', edadMinimaPago = 0 } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre del viaje es requerido.' });
  }

  const [result] = await pool.query(
    'INSERT INTO viajes (nombre, fecha_inicio, fecha_fin, nota, tipo, divisa, edad_minima_pago) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [nombre, fechaInicio || null, fechaFin || null, nota || null, tipo, divisa, Number(edadMinimaPago) || 0]
  );

  registrarLog(req.usuario, 'crear', 'viaje', result.insertId, `${req.usuario} creó el viaje "${nombre}"`);

  res.status(201).json({ id: result.insertId, nombre, fechaInicio, fechaFin, nota, tipo, divisa, edadMinimaPago: Number(edadMinimaPago) || 0 });
});

// ← NUEVO: editar viaje
router.put('/:id', async (req, res) => {
  const viajeId = Number(req.params.id);
  const { nombre, fechaInicio, fechaFin, nota, tipo, divisa, edadMinimaPago = 0 } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es requerido.' });
  }

  // Asegurar que la columna exista (safe migration)
  try {
    await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS edad_minima_pago INT NOT NULL DEFAULT 0`);
  } catch (_) {}

  await pool.query(
    `UPDATE viajes SET
      nombre = ?,
      fecha_inicio = ?,
      fecha_fin = ?,
      nota = ?,
      tipo = ?,
      divisa = ?,
      edad_minima_pago = ?
     WHERE id = ?`,
    [nombre, fechaInicio || null, fechaFin || null, nota || null, tipo || 'resort', divisa || 'USD', Number(edadMinimaPago) || 0, viajeId]
  );

  registrarLog(req.usuario, 'editar', 'viaje', viajeId, `${req.usuario} editó el viaje "${nombre}"`);

  res.json({ id: viajeId, nombre, fechaInicio, fechaFin, nota, tipo, divisa, edadMinimaPago: Number(edadMinimaPago) || 0 });
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
    registrarLog(req.usuario, 'eliminar', 'viaje', viajeId, `${req.usuario} eliminó el viaje ${viajeId}`);
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
    registrarLog(req.usuario, 'crear', 'viaje', viaje.id, `${req.usuario} inicializó el viaje predeterminado "${viaje.nombre}"`);
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
  const tipo = req.body.tipo === 'pendientes' ? 'pendientes' : 'completo';

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
        ADD COLUMN IF NOT EXISTS expira_compartir DATETIME NULL,
        ADD COLUMN IF NOT EXISTS tipo_compartir VARCHAR(20) DEFAULT 'completo'
      `);
    } catch (err) {
      console.log('Nota:', err.message);
    }

    await pool.query(
      `UPDATE viajes
       SET token_compartir = ?,
           compartir_activo = 1,
           expira_compartir = ?,
           tipo_compartir = ?
       WHERE id = ?`,
      [token, expiraCompartir, tipo, viajeId]
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
    
    registrarLog(req.usuario, 'editar', 'viaje', viajeId, `${req.usuario} generó un link para compartir el viaje ${viajeId} (${tipo === 'pendientes' ? 'solo pendientes' : 'completo'})`);

    res.json({
      ok: true,
      token,
      tipo,
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

// Desactivar link de compartir
router.delete('/:id/compartir', async (req, res) => {
  const viajeId = Number(req.params.id);

  try {
    await pool.query('UPDATE viajes SET compartir_activo = 0 WHERE id = ?', [viajeId]);
    registrarLog(req.usuario, 'editar', 'viaje', viajeId, `${req.usuario} desactivó el enlace compartido del viaje ${viajeId}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error desactivando link:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;