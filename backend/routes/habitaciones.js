import { Router } from 'express';
import pool from '../db.js';
import { registrarLog } from '../utils/log.js';

const router = Router();

// Migración idempotente: agrega es_gratis a personas si no existe
pool.query(`ALTER TABLE personas ADD COLUMN IF NOT EXISTS es_gratis TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});

const mapHabitaciones = (rows) => {
  const habitaciones = [];
  const mapa = new Map();

  rows.forEach((row) => {
    if (!mapa.has(row.habitacion_id)) {
      const habitacion = {
        id: row.habitacion_id,
        num: row.numero,
        tipo: row.tipo,
        total: Number(row.total),
        precioNino: Number(row.precio_nino || 0),
        edadMinimaPago: Number(row.edad_minima_pago || 0),
        stack: !!row.es_stack,
        nota: row.nota || '',
        etiqueta: row.etiqueta || '',
        personas: [],
      };
      mapa.set(row.habitacion_id, habitacion);
      habitaciones.push(habitacion);
    }

    const habitacion = mapa.get(row.habitacion_id);

    if (row.persona_id) {
      let persona = habitacion.personas.find((item) => item.id === row.persona_id);
      if (!persona) {
        persona = {
          id: row.persona_id,
          n: row.nombre,
          posicion: row.posicion,
          esNino: !!row.es_nino,
          esGratis: !!row.es_gratis,
          pagos: [],
        };
        habitacion.personas.push(persona);
      }

      if (row.pago_id) {
        persona.pagos.push({
          id: row.pago_id,
          mes: row.mes,
          monto: Number(row.monto),
        });
      }
    }
  });

  return habitaciones;
};

router.get('/', async (req, res) => {
  const viajeId = req.query.viajeId ? Number(req.query.viajeId) : null;
  const query = [];
  const params = [];

  if (viajeId) {
    query.push('WHERE h.viaje_id = ?');
    params.push(viajeId);
  }

  const [rows] = await pool.query(`
    SELECT
      h.id AS habitacion_id,
      h.numero,
      h.tipo,
      h.total,
      h.precio_nino,
      h.es_stack,
      h.nota,
      h.etiqueta,
      COALESCE(v.edad_minima_pago, 0) AS edad_minima_pago,
      p.id AS persona_id,
      p.nombre,
      p.posicion,
      p.es_nino,
      p.es_gratis,
      pag.id AS pago_id,
      pag.mes,
      pag.monto
    FROM habitaciones h
    LEFT JOIN viajes v ON h.viaje_id = v.id
    LEFT JOIN personas p ON p.habitacion_id = h.id
    LEFT JOIN pagos pag ON pag.persona_id = p.id
    ${query.join(' ')}
    ORDER BY h.etiqueta, h.id, p.posicion, pag.id
  `, params);

  res.json(mapHabitaciones(rows));
});

router.post('/', async (req, res) => {
  const { num, tipo, total, precioNino, stack, nota, etiqueta, personas = [] } = req.body;

  if (!num || !tipo) {
    return res.status(400).json({ error: 'Número y tipo son requeridos.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO habitaciones (numero, tipo, total, precio_nino, es_stack, nota, etiqueta, viaje_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [num, tipo, total || 0, precioNino || 0, stack ? 1 : 0, nota || '', etiqueta || '', req.body.viajeId || null]
    );

    const habitacionId = result.insertId;
    const personaRows = [];

    for (let index = 0; index < personas.length; index += 1) {
      const persona = personas[index];
      if (!persona || !persona.n) continue;

      const esNino = persona.esNino ? 1 : 0;
      const esGratis = (esNino && persona.esGratis) ? 1 : 0;
      const [personaResult] = await connection.query(
        'INSERT INTO personas (habitacion_id, nombre, posicion, es_nino, es_gratis) VALUES (?, ?, ?, ?, ?)',
        [habitacionId, persona.n, index + 1, esNino, esGratis]
      );

      personaRows.push({
        id: personaResult.insertId,
        n: persona.n,
        posicion: index + 1,
        esNino: !!persona.esNino,
        esGratis: !!(esNino && persona.esGratis),
        pagos: [],
      });
    }

    // Obtener edadMinimaPago del viaje asociado
    let edadMinimaPago = 0;
    if (req.body.viajeId) {
      const [vRows] = await connection.query(
        'SELECT COALESCE(edad_minima_pago, 0) AS edp FROM viajes WHERE id = ?',
        [req.body.viajeId]
      );
      if (vRows[0]) edadMinimaPago = Number(vRows[0].edp) || 0;
    }

    await connection.commit();

    registrarLog(req.usuario, 'crear', 'habitacion', habitacionId, `${req.usuario} creó la habitación ${num}`);

    res.status(201).json({
      id: habitacionId,
      num,
      tipo,
      total: Number(total || 0),
      precioNino: Number(precioNino || 0),
      edadMinimaPago,
      stack: !!stack,
      nota: nota || '',
      etiqueta: etiqueta || '',
      personas: personaRows,
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// ← NUEVO: editar habitación (num, tipo, total, precioNino, etiqueta)
router.put('/:id', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { num, tipo, total, precioNino, etiqueta, stack } = req.body;

  if (!num || !tipo) {
    return res.status(400).json({ error: 'Número y tipo son requeridos.' });
  }

  await pool.query(
    `UPDATE habitaciones SET 
      numero = ?, tipo = ?, total = ?, precio_nino = ?, etiqueta = ?, es_stack = ?
     WHERE id = ?`,
    [num, tipo, Number(total) || 0, Number(precioNino) || 0, etiqueta || '', stack ? 1 : 0, habitacionId]
  );

  registrarLog(req.usuario, 'editar', 'habitacion', habitacionId, `${req.usuario} editó la habitación ${num}`);

  res.json({ id: habitacionId, num, tipo, total: Number(total) || 0, precioNino: Number(precioNino) || 0, etiqueta, stack: !!stack });
});

router.post('/:id/personas', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { nombre, esNino, esGratis } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Nombre es requerido.' });
  }

  const [posRows] = await pool.query(
    'SELECT COALESCE(MAX(posicion), 0) + 1 AS siguiente FROM personas WHERE habitacion_id = ?',
    [habitacionId]
  );
  const posicion = posRows[0].siguiente;

  const esNinoVal = esNino ? 1 : 0;
  const esGratisVal = (esNino && esGratis) ? 1 : 0;

  const [result] = await pool.query(
    'INSERT INTO personas (habitacion_id, nombre, posicion, es_nino, es_gratis) VALUES (?, ?, ?, ?, ?)',
    [habitacionId, nombre.trim(), posicion, esNinoVal, esGratisVal]
  );

  registrarLog(req.usuario, 'crear', 'persona', result.insertId, `${req.usuario} agregó a ${nombre.trim()} en la habitación ${habitacionId}`);

  res.status(201).json({ id: result.insertId, n: nombre.trim(), posicion, esNino: !!esNino, esGratis: !!(esNino && esGratis), pagos: [] });
});

router.delete('/:id', async (req, res) => {
  const habitacionId = Number(req.params.id);
  await pool.query('DELETE FROM habitaciones WHERE id = ?', [habitacionId]);
  registrarLog(req.usuario, 'eliminar', 'habitacion', habitacionId, `${req.usuario} eliminó la habitación ${habitacionId}`);
  res.json({ ok: true });
});

router.patch('/:id/tipo', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { nuevoTipo } = req.body;

  if (!nuevoTipo || !['Single', 'Doble', 'Triple'].includes(nuevoTipo)) {
    return res.status(400).json({ error: 'Tipo inválido.' });
  }

  const [hab] = await pool.query(
    'SELECT COUNT(*) as ocupados FROM personas WHERE habitacion_id = ? AND nombre IS NOT NULL AND nombre != ""',
    [habitacionId]
  );

  const ocupados = hab[0].ocupados;
  const capacidadRequerida = nuevoTipo === 'Triple' ? 3 : nuevoTipo === 'Single' ? 1 : 2;

  if (ocupados > capacidadRequerida) {
    return res.status(400).json({ error: `No se puede cambiar a ${nuevoTipo} con ${ocupados} personas.` });
  }

  await pool.query('UPDATE habitaciones SET tipo = ? WHERE id = ?', [nuevoTipo, habitacionId]);
  registrarLog(req.usuario, 'editar', 'habitacion', habitacionId, `${req.usuario} cambió el tipo de la habitación ${habitacionId} a ${nuevoTipo}`);
  res.json({ ok: true });
});

router.put('/:id/nota', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { nota } = req.body;
  await pool.query('UPDATE habitaciones SET nota = ? WHERE id = ?', [nota || '', habitacionId]);
  registrarLog(req.usuario, 'editar', 'habitacion', habitacionId, `${req.usuario} actualizó la nota de la habitación ${habitacionId}`);
  res.json({ ok: true });
});

router.put('/:id/etiqueta', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { etiqueta } = req.body;
  await pool.query('UPDATE habitaciones SET etiqueta = ? WHERE id = ?', [etiqueta || '', habitacionId]);
  registrarLog(req.usuario, 'editar', 'habitacion', habitacionId, `${req.usuario} actualizó la etiqueta de la habitación ${habitacionId} a "${etiqueta || ''}"`);
  res.json({ ok: true });
});

export default router;