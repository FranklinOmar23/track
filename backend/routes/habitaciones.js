import { Router } from 'express';
import pool from '../db.js';

const router = Router();

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
      p.id AS persona_id,
      p.nombre,
      p.posicion,
      p.es_nino,
      pag.id AS pago_id,
      pag.mes,
      pag.monto
    FROM habitaciones h
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
      const [personaResult] = await connection.query(
        'INSERT INTO personas (habitacion_id, nombre, posicion, es_nino) VALUES (?, ?, ?, ?)',
        [habitacionId, persona.n, index + 1, esNino]
      );

      personaRows.push({
        id: personaResult.insertId,
        n: persona.n,
        posicion: index + 1,
        esNino: !!persona.esNino,
        pagos: [],
      });
    }

    await connection.commit();

    res.status(201).json({
      id: habitacionId,
      num,
      tipo,
      total: Number(total || 0),
      precioNino: Number(precioNino || 0),
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

  res.json({ id: habitacionId, num, tipo, total: Number(total) || 0, precioNino: Number(precioNino) || 0, etiqueta, stack: !!stack });
});

router.post('/:id/personas', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { nombre, esNino } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Nombre es requerido.' });
  }

  const [posRows] = await pool.query(
    'SELECT COALESCE(MAX(posicion), 0) + 1 AS siguiente FROM personas WHERE habitacion_id = ?',
    [habitacionId]
  );
  const posicion = posRows[0].siguiente;

  const [result] = await pool.query(
    'INSERT INTO personas (habitacion_id, nombre, posicion, es_nino) VALUES (?, ?, ?, ?)',
    [habitacionId, nombre.trim(), posicion, esNino ? 1 : 0]
  );

  res.status(201).json({ id: result.insertId, n: nombre.trim(), posicion, esNino: !!esNino, pagos: [] });
});

router.delete('/:id', async (req, res) => {
  const habitacionId = Number(req.params.id);
  await pool.query('DELETE FROM habitaciones WHERE id = ?', [habitacionId]);
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
  res.json({ ok: true });
});

router.put('/:id/nota', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { nota } = req.body;
  await pool.query('UPDATE habitaciones SET nota = ? WHERE id = ?', [nota || '', habitacionId]);
  res.json({ ok: true });
});

router.put('/:id/etiqueta', async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { etiqueta } = req.body;
  await pool.query('UPDATE habitaciones SET etiqueta = ? WHERE id = ?', [etiqueta || '', habitacionId]);
  res.json({ ok: true });
});

export default router;