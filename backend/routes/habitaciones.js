import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';

import { viajeBodyAbierto, habitacionParamAbierta } from '../utils/viajeCerrado.js';
import { registrarLog } from '../utils/log.js';
import { contextoHabitacion, fotoHabitacion, fmtMonto, firmaHabitacion } from '../utils/auditoria.js';

const CAMPOS_EDITABLES = 'SELECT numero, tipo, total, precio_nino, etiqueta, es_stack, nota FROM habitaciones WHERE id = ?';
const normalizarFila = (r) => ({ ...r, total: Number(r.total), precio_nino: Number(r.precio_nino) });

const router = asyncRouter();

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
        enRevision: !!row.en_revision,
        revisionNota: row.revision_nota || '',
        revisionPor: row.revision_por || null,
        revisionAt: row.revision_at || null,
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
          esStack: !!row.persona_es_stack,
          pagos: [],
        };
        habitacion.personas.push(persona);
      }

      if (row.pago_id) {
        persona.pagos.push({
          id: row.pago_id,
          mes: row.mes,
          anio: row.anio,
          monto: Number(row.monto),
        });
      }
    }
  });

  return habitaciones;
};

/**
 * Habitaciones con personas y pagos, ya agrupadas. Filtra por viajeId o por slug del viaje
 * (el slug permite abrir un viaje con una sola consulta, sin buscar antes su id).
 */
export const consultarHabitaciones = async ({ viajeId = null, slug = null, habitacionId = null } = {}, conn = pool) => {
  const where = habitacionId ? 'WHERE h.id = ?' : viajeId ? 'WHERE h.viaje_id = ?' : slug ? 'WHERE v.slug = ?' : '';
  const params = habitacionId ? [habitacionId] : viajeId ? [viajeId] : slug ? [slug] : [];
  const [rows] = await conn.query(`
    SELECT
      h.id AS habitacion_id,
      h.numero,
      h.tipo,
      h.total,
      h.precio_nino,
      h.es_stack,
      h.nota,
      h.etiqueta,
      h.en_revision,
      h.revision_nota,
      h.revision_por,
      h.revision_at,
      COALESCE(v.edad_minima_pago, 0) AS edad_minima_pago,
      p.id AS persona_id,
      p.nombre,
      p.posicion,
      p.es_nino,
      p.es_gratis,
      COALESCE(p.es_stack, 0) AS persona_es_stack,
      pag.id AS pago_id,
      pag.mes,
      COALESCE(pag.anio, YEAR(pag.created_at)) AS anio,
      pag.monto
    FROM habitaciones h
    LEFT JOIN viajes v ON h.viaje_id = v.id
    LEFT JOIN personas p ON p.habitacion_id = h.id
    LEFT JOIN pagos pag ON pag.persona_id = p.id
    ${where}
    ORDER BY h.etiqueta, h.id, p.posicion, pag.id
  `, params);
  return mapHabitaciones(rows);

};

router.get('/', async (req, res) => {
  const viajeId = req.query.viajeId ? Number(req.query.viajeId) : null;
  res.json(await consultarHabitaciones({ viajeId }));
});

router.post('/', viajeBodyAbierto, async (req, res) => {
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
      const esStack = persona.esStack ? 1 : 0;
      const [personaResult] = await connection.query(
        'INSERT INTO personas (habitacion_id, nombre, posicion, es_nino, es_gratis, es_stack) VALUES (?, ?, ?, ?, ?, ?)',
        [habitacionId, persona.n, index + 1, esNino, esGratis, esStack]
      );

      personaRows.push({
        id: personaResult.insertId,
        n: persona.n,
        posicion: index + 1,
        esNino: !!persona.esNino,
        esGratis: !!(esNino && persona.esGratis),
        esStack: !!esStack,
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

    const ctx = await contextoHabitacion(pool, habitacionId);
    registrarLog(req.usuario, 'crear', 'habitacion', habitacionId,
      `${req.usuario} creó la ${ctx}${personaRows.length ? ` con ${personaRows.map((x) => x.n).join(', ')}` : ''}`,
      { op: 'habitacion.crear', habitacionId });

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
router.put('/:id', habitacionParamAbierta, async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { num, tipo, total, precioNino, etiqueta, stack } = req.body;

  if (!num || !tipo) {
    return res.status(400).json({ error: 'Número y tipo son requeridos.' });
  }

  const [antesRows] = await pool.query(CAMPOS_EDITABLES, [habitacionId]);
  if (!antesRows[0]) return res.status(404).json({ error: 'Habitación no encontrada.' });

  await pool.query(
    `UPDATE habitaciones SET 
      numero = ?, tipo = ?, total = ?, precio_nino = ?, etiqueta = ?, es_stack = ?
     WHERE id = ?`,
    [num, tipo, Number(total) || 0, Number(precioNino) || 0, etiqueta || '', stack ? 1 : 0, habitacionId]
  );

  const [despuesRows] = await pool.query(CAMPOS_EDITABLES, [habitacionId]);
  const antes = normalizarFila(antesRows[0]);
  const despues = normalizarFila(despuesRows[0]);
  const ETIQUETAS = { numero: 'número', tipo: 'tipo', total: 'total', precio_nino: 'precio niño', etiqueta: 'etiqueta', es_stack: 'stack' };
  const cambios = Object.keys(ETIQUETAS)
    .filter((k) => String(antes[k]) !== String(despues[k]))
    .map((k) => `${ETIQUETAS[k]}: ${antes[k] === '' ? '—' : antes[k]} → ${despues[k] === '' ? '—' : despues[k]}`);
  const ctx = await contextoHabitacion(pool, habitacionId);
  if (cambios.length) {
    const { nota: _n1, ...antesSinNota } = antes;
    const { nota: _n2, ...despuesSinNota } = despues;
    registrarLog(req.usuario, 'editar', 'habitacion', habitacionId,
      `${req.usuario} editó la ${ctx} (${cambios.join(', ')})`,
      { op: 'habitacion.editar', habitacionId, antes: antesSinNota, despues: despuesSinNota });
  }

  res.json({ id: habitacionId, num, tipo, total: Number(total) || 0, precioNino: Number(precioNino) || 0, etiqueta, stack: !!stack });
});

router.post('/:id/personas', habitacionParamAbierta, async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { nombre, esNino, esGratis, esStack } = req.body;

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
  const esStackVal = esStack ? 1 : 0;

  const [result] = await pool.query(
    'INSERT INTO personas (habitacion_id, nombre, posicion, es_nino, es_gratis, es_stack) VALUES (?, ?, ?, ?, ?, ?)',
    [habitacionId, nombre.trim(), posicion, esNinoVal, esGratisVal, esStackVal]
  );

  const ctx = await contextoHabitacion(pool, habitacionId);
  registrarLog(req.usuario, 'crear', 'persona', result.insertId,
    `${req.usuario} agregó a ${nombre.trim()} en la ${ctx}`,
    { op: 'persona.crear', personaId: result.insertId });

  res.status(201).json({ id: result.insertId, n: nombre.trim(), posicion, esNino: !!esNino, esGratis: !!(esNino && esGratis), esStack: !!esStack, pagos: [] });
});

router.delete('/:id', habitacionParamAbierta, async (req, res) => {
  const habitacionId = Number(req.params.id);
  const foto = await fotoHabitacion(pool, habitacionId);
  if (!foto) return res.status(404).json({ error: 'Habitación no encontrada.' });
  const ctx = await contextoHabitacion(pool, habitacionId);
  const [viajeRows] = await pool.query("SELECT COALESCE(divisa, 'USD') AS divisa FROM viajes WHERE id = ?", [foto.habitacion.viaje_id]);

  await pool.query('DELETE FROM habitaciones WHERE id = ?', [habitacionId]);

  const totalPagos = foto.pagos.reduce((s, x) => s + x.monto, 0);
  const nombres = foto.personas.map((x) => x.nombre).filter(Boolean);
  registrarLog(req.usuario, 'eliminar', 'habitacion', habitacionId,
    `${req.usuario} eliminó la ${ctx}${nombres.length ? ` (${nombres.join(', ')})` : ''}${foto.pagos.length ? ` con ${foto.pagos.length} pago(s) por ${fmtMonto(totalPagos, viajeRows[0]?.divisa)}` : ''}`,
    { op: 'habitacion.eliminar', foto });
  res.json({ ok: true });
});

router.put('/:id/nota', habitacionParamAbierta, async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { nota } = req.body;
  const [antesRows] = await pool.query('SELECT nota FROM habitaciones WHERE id = ?', [habitacionId]);
  if (!antesRows[0]) return res.status(404).json({ error: 'Habitación no encontrada.' });
  await pool.query('UPDATE habitaciones SET nota = ? WHERE id = ?', [nota || '', habitacionId]);
  const ctx = await contextoHabitacion(pool, habitacionId);
  registrarLog(req.usuario, 'editar', 'habitacion', habitacionId,
    `${req.usuario} actualizó la nota de la ${ctx}`,
    { op: 'habitacion.editar', habitacionId, antes: { nota: antesRows[0].nota || '' }, despues: { nota: nota || '' } });
  res.json({ ok: true });
});

router.put('/:id/etiqueta', habitacionParamAbierta, async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { etiqueta } = req.body;
  const [antesRows] = await pool.query('SELECT etiqueta FROM habitaciones WHERE id = ?', [habitacionId]);
  if (!antesRows[0]) return res.status(404).json({ error: 'Habitación no encontrada.' });
  await pool.query('UPDATE habitaciones SET etiqueta = ? WHERE id = ?', [etiqueta || '', habitacionId]);
  const ctx = await contextoHabitacion(pool, habitacionId);
  registrarLog(req.usuario, 'editar', 'habitacion', habitacionId,
    `${req.usuario} cambió la etiqueta de la ${ctx}: "${antesRows[0].etiqueta || '—'}" → "${etiqueta || '—'}"`,
    { op: 'habitacion.editar', habitacionId, antes: { etiqueta: antesRows[0].etiqueta || '' }, despues: { etiqueta: etiqueta || '' } });
  res.json({ ok: true });
});

router.put('/:id/revision', habitacionParamAbierta, async (req, res) => {
  const habitacionId = Number(req.params.id);
  const enRevision = req.body.enRevision ? 1 : 0;
  const nota = enRevision ? String(req.body.nota || '').trim().slice(0, 255) : null;

  const [antesRows] = await pool.query(
    'SELECT en_revision, revision_nota, revision_por, revision_at FROM habitaciones WHERE id = ?', [habitacionId]);
  if (!antesRows[0]) return res.status(404).json({ error: 'Habitación no encontrada.' });

  const por = enRevision ? req.usuario : null;
  const fecha = enRevision ? new Date() : null;
  await pool.query(
    'UPDATE habitaciones SET en_revision = ?, revision_nota = ?, revision_por = ?, revision_at = ? WHERE id = ?',
    [enRevision, nota, por, fecha, habitacionId]);

  const ctx = await contextoHabitacion(pool, habitacionId);
  const antes = antesRows[0];
  registrarLog(req.usuario, 'editar', 'habitacion', habitacionId,
    enRevision
      ? `${req.usuario} puso en revisión la ${ctx}${nota ? `: "${nota}"` : ''}`
      : `${req.usuario} quitó de revisión la ${ctx}${antes.revision_nota ? ` (motivo: "${antes.revision_nota}")` : ''}`,
    {
      op: 'habitacion.editar',
      habitacionId,
      antes: {
        en_revision: Number(antes.en_revision) || 0,
        revision_nota: antes.revision_nota,
        revision_por: antes.revision_por,
        revision_at: antes.revision_at,
      },
      despues: { en_revision: enRevision, revision_nota: nota },
    });

  res.json({
    id: habitacionId,
    enRevision: !!enRevision,
    revisionNota: nota || '',
    revisionPor: por,
    revisionAt: fecha ? fecha.toISOString() : null,
  });
});

// ── Edición completa en una sola petición y una sola transacción ──────────────
// Antes el modal hacía hasta 7 llamadas seguidas (renombrar, borrar, agregar personas, niños,
// datos de la habitación): lento y, si una fallaba a mitad, la habitación quedaba guardada a medias.
const ETIQUETAS_HAB = { numero: 'número', tipo: 'tipo', total: 'total', precio_nino: 'precio niño', etiqueta: 'etiqueta', es_stack: 'stack' };

const describirCambios = (antes, despues) => {
  const cambios = Object.keys(ETIQUETAS_HAB)
    .filter((k) => String(antes.habitacion[k] ?? '') !== String(despues.habitacion[k] ?? ''))
    .map((k) => `${ETIQUETAS_HAB[k]}: ${antes.habitacion[k] === '' ? '—' : antes.habitacion[k]} → ${despues.habitacion[k] === '' ? '—' : despues.habitacion[k]}`);
  const idsAntes = new Map(antes.personas.map((p) => [p.id, p]));
  const idsDespues = new Map(despues.personas.map((p) => [p.id, p]));
  const quitadas = antes.personas.filter((p) => !idsDespues.has(p.id)).map((p) => p.nombre);
  const agregadas = despues.personas.filter((p) => !idsAntes.has(p.id)).map((p) => p.nombre);
  despues.personas.forEach((p) => {
    const a = idsAntes.get(p.id);
    if (!a) return;
    if (a.nombre !== p.nombre) cambios.push(`"${a.nombre}" → "${p.nombre}"`);
    if (Number(a.es_stack) !== Number(p.es_stack)) cambios.push(`${p.nombre} ${Number(p.es_stack) ? 'ahora es stack' : 'ya no es stack'}`);
    if (Number(a.es_gratis) !== Number(p.es_gratis)) cambios.push(`${p.nombre} ${Number(p.es_gratis) ? 'ahora gratis' : 'ya no es gratis'}`);
  });
  if (agregadas.length) cambios.push(`agregó a ${agregadas.join(', ')}`);
  if (quitadas.length) cambios.push(`quitó a ${quitadas.join(', ')}`);
  return cambios;
};

router.put('/:id/completa', habitacionParamAbierta, async (req, res) => {
  const habitacionId = Number(req.params.id);
  const { num, tipo, total, precioNino, etiqueta, stack } = req.body;
  const personas = Array.isArray(req.body.personas) ? req.body.personas : [];

  if (!num || !tipo) return res.status(400).json({ error: 'Número y tipo son requeridos.' });
  if (personas.some((p) => !p || !String(p.nombre || '').trim())) {
    return res.status(400).json({ error: 'Todas las personas necesitan un nombre.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const antes = await fotoHabitacion(connection, habitacionId);
    if (!antes) {
      await connection.rollback();
      return res.status(404).json({ error: 'Habitación no encontrada.' });
    }

    // 1) Quitar a quien ya no está en la lista
    const idsEnviados = new Set(personas.filter((p) => p.id).map((p) => Number(p.id)));
    const quitar = antes.personas.filter((p) => !idsEnviados.has(p.id)).map((p) => p.id);
    if (quitar.length) await connection.query('DELETE FROM personas WHERE id IN (?)', [quitar]);

    // 2) Actualizar las que siguen y 3) agregar las nuevas
    const existentes = new Map(antes.personas.map((p) => [p.id, p]));
    let siguientePos = antes.personas.reduce((m, p) => Math.max(m, p.posicion || 0), 0) + 1;
    for (const p of personas) {
      const nombre = String(p.nombre).trim();
      const esNino = p.esNino ? 1 : 0;
      const esGratis = esNino && p.esGratis ? 1 : 0;
      const esStack = p.esStack ? 1 : 0;
      const actual = p.id ? existentes.get(Number(p.id)) : null;
      if (actual) {
        if (actual.nombre !== nombre || Number(actual.es_nino) !== esNino
          || Number(actual.es_gratis) !== esGratis || Number(actual.es_stack) !== esStack) {
          await connection.query(
            'UPDATE personas SET nombre = ?, es_nino = ?, es_gratis = ?, es_stack = ? WHERE id = ?',
            [nombre, esNino, esGratis, esStack, actual.id]);
        }
      } else {
        await connection.query(
          'INSERT INTO personas (habitacion_id, nombre, posicion, es_nino, es_gratis, es_stack) VALUES (?, ?, ?, ?, ?, ?)',
          [habitacionId, nombre, siguientePos, esNino, esGratis, esStack]);
        siguientePos += 1;
      }
    }

    // 4) Datos de la habitación (el tipo elegido por el usuario manda)
    await connection.query(
      'UPDATE habitaciones SET numero = ?, tipo = ?, total = ?, precio_nino = ?, etiqueta = ?, es_stack = ? WHERE id = ?',
      [num, tipo, Number(total) || 0, Number(precioNino) || 0, etiqueta || '', stack ? 1 : 0, habitacionId]);

    await connection.commit();

    // Fuera de la transacción y en paralelo: la foto para el registro y la habitación para la respuesta
    const [despues, [habitacion]] = await Promise.all([
      fotoHabitacion(pool, habitacionId),
      consultarHabitaciones({ habitacionId }),
    ]);

    const cambios = describirCambios(antes, despues);
    if (cambios.length) {
      const ctx = await contextoHabitacion(pool, habitacionId);
      registrarLog(req.usuario, 'editar', 'habitacion', habitacionId,
        `${req.usuario} editó la ${ctx} (${cambios.join(', ')})`,
        { op: 'habitacion.restaurar', habitacionId, antes, firmaDespues: firmaHabitacion(despues) });
    }

    res.json(habitacion);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export default router;