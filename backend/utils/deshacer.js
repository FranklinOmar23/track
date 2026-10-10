// Operaciones de "deshacer" del registro de actividad.
// Cada acción guardada con `deshacer = { op, ... }` tiene aquí su reversión.
// Regla: solo se deshace si el dato sigue como lo dejó la acción (si alguien lo cambió
// después, hay que deshacer primero lo más reciente). Nunca sobre viajes cerrados,
// salvo deshacer el propio cierre.

import { ajustarTipoPorAdultos } from './habitacion.js';

export class ErrorDeshacer extends Error {}

const CAMBIO_POSTERIOR = 'Este dato cambió después de esta acción. Deshaz primero las acciones más recientes.';

const fecha = (v) => (v ? new Date(v) : null);
const igual = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null);
  if (!Number.isNaN(Number(a)) && !Number.isNaN(Number(b)) && a !== '' && b !== '') return Number(a) === Number(b);
  return String(a) === String(b);
};
const mismosCampos = (actual, esperado) => Object.keys(esperado).every((k) => igual(actual[k], esperado[k]));

const viajeAbierto = async (conn, sql, params) => {
  const [rows] = await conn.query(sql, params);
  if (rows[0]?.estado === 'cerrado') {
    throw new ErrorDeshacer('El viaje está cerrado. Reábrelo para deshacer acciones.');
  }
};
const viajeAbiertoPorHabitacion = (conn, habitacionId) => viajeAbierto(conn,
  'SELECT v.estado FROM habitaciones h JOIN viajes v ON v.id = h.viaje_id WHERE h.id = ?', [habitacionId]);
const viajeAbiertoPorViaje = (conn, viajeId) => viajeAbierto(conn,
  'SELECT estado FROM viajes WHERE id = ?', [viajeId]);

const insertarPersona = (conn, p) => conn.query(
  'INSERT INTO personas (id, habitacion_id, nombre, posicion, es_nino, es_gratis) VALUES (?, ?, ?, ?, ?, ?)',
  [p.id, p.habitacion_id, p.nombre, p.posicion, p.es_nino, p.es_gratis]);
const insertarPago = (conn, p) => conn.query(
  'INSERT INTO pagos (id, persona_id, mes, anio, monto, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  [p.id, p.persona_id, p.mes, p.anio, p.monto, fecha(p.created_at)]);

const existe = async (conn, tabla, id) => {
  const [rows] = await conn.query(`SELECT id FROM ${tabla} WHERE id = ?`, [id]);
  return rows.length > 0;
};

const pagoActual = async (conn, pagoId) => {
  const [rows] = await conn.query(
    `SELECT p.id, p.persona_id, p.mes, p.anio, p.monto, pe.habitacion_id
     FROM pagos p JOIN personas pe ON pe.id = p.persona_id WHERE p.id = ?`, [pagoId]);
  return rows[0] || null;
};

const personaActual = async (conn, personaId) => {
  const [rows] = await conn.query(
    'SELECT id, habitacion_id, nombre, posicion, COALESCE(es_gratis, 0) AS es_gratis FROM personas WHERE id = ?',
    [personaId]);
  return rows[0] || null;
};

export const OPERACIONES = {
  // ── Pagos ──
  'pago.crear': async (conn, d) => {
    const actual = await pagoActual(conn, d.pagoId);
    if (!actual) throw new ErrorDeshacer('El pago ya no existe.');
    if (!mismosCampos(actual, d.despues)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    await viajeAbiertoPorHabitacion(conn, actual.habitacion_id);
    await conn.query('DELETE FROM pagos WHERE id = ?', [d.pagoId]);
  },

  'pago.editar': async (conn, d) => {
    const actual = await pagoActual(conn, d.pagoId);
    if (!actual) throw new ErrorDeshacer('El pago ya no existe.');
    if (!mismosCampos(actual, d.despues)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    await viajeAbiertoPorHabitacion(conn, actual.habitacion_id);
    await conn.query('UPDATE pagos SET mes = ?, anio = ?, monto = ? WHERE id = ?',
      [d.antes.mes, d.antes.anio, d.antes.monto, d.pagoId]);
  },

  'pago.eliminar': async (conn, d) => {
    const persona = await personaActual(conn, d.pago.persona_id);
    if (!persona) throw new ErrorDeshacer('La persona de este pago ya no existe.');
    if (await existe(conn, 'pagos', d.pago.id)) throw new ErrorDeshacer('El pago ya fue restaurado.');
    await viajeAbiertoPorHabitacion(conn, persona.habitacion_id);
    await insertarPago(conn, d.pago);
  },

  // ── Personas ──
  'persona.renombrar': async (conn, d) => {
    const actual = await personaActual(conn, d.personaId);
    if (!actual) throw new ErrorDeshacer('La persona ya no existe.');
    if (!igual(actual.nombre, d.despues)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    await viajeAbiertoPorHabitacion(conn, actual.habitacion_id);
    await conn.query('UPDATE personas SET nombre = ? WHERE id = ?', [d.antes, d.personaId]);
  },

  'persona.gratis': async (conn, d) => {
    const actual = await personaActual(conn, d.personaId);
    if (!actual) throw new ErrorDeshacer('La persona ya no existe.');
    if (!igual(actual.es_gratis, d.despues)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    await viajeAbiertoPorHabitacion(conn, actual.habitacion_id);
    await conn.query('UPDATE personas SET es_gratis = ? WHERE id = ?', [d.antes, d.personaId]);
  },

  'persona.crear': async (conn, d) => {
    const actual = await personaActual(conn, d.personaId);
    if (!actual) throw new ErrorDeshacer('La persona ya no existe.');
    const [pagos] = await conn.query('SELECT COUNT(*) AS n FROM pagos WHERE persona_id = ?', [d.personaId]);
    if (Number(pagos[0].n) > 0) throw new ErrorDeshacer('La persona ya tiene pagos registrados; elimínalos primero.');
    await viajeAbiertoPorHabitacion(conn, actual.habitacion_id);
    await conn.query('DELETE FROM personas WHERE id = ?', [d.personaId]);
    await ajustarTipoPorAdultos(conn, actual.habitacion_id);
  },

  'persona.eliminar': async (conn, d) => {
    const { persona, pagos } = d.foto;
    if (!(await existe(conn, 'habitaciones', persona.habitacion_id))) {
      throw new ErrorDeshacer('La habitación de esta persona ya no existe.');
    }
    if (await existe(conn, 'personas', persona.id)) throw new ErrorDeshacer('La persona ya fue restaurada.');
    await viajeAbiertoPorHabitacion(conn, persona.habitacion_id);
    await insertarPersona(conn, persona);
    for (const pago of pagos) await insertarPago(conn, pago);
    if (d.tipoHabitacionAntes) {
      await conn.query('UPDATE habitaciones SET tipo = ? WHERE id = ?', [d.tipoHabitacionAntes, persona.habitacion_id]);
    }
  },

  'persona.mover': async (conn, d) => {
    const actual = await personaActual(conn, d.personaId);
    if (!actual) throw new ErrorDeshacer('La persona ya no existe.');
    if (!igual(actual.habitacion_id, d.destinoId)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    if (!(await existe(conn, 'habitaciones', d.origenId))) throw new ErrorDeshacer('La habitación de origen ya no existe.');
    await viajeAbiertoPorHabitacion(conn, d.origenId);
    await viajeAbiertoPorHabitacion(conn, d.destinoId);
    await conn.query('UPDATE personas SET habitacion_id = ?, posicion = ? WHERE id = ?',
      [d.origenId, d.posicionAntes, d.personaId]);
    await conn.query('UPDATE habitaciones SET tipo = ? WHERE id = ?', [d.tipoOrigenAntes, d.origenId]);
    await conn.query('UPDATE habitaciones SET tipo = ? WHERE id = ?', [d.tipoDestinoAntes, d.destinoId]);
  },

  // ── Habitaciones ──
  'habitacion.crear': async (conn, d) => {
    if (!(await existe(conn, 'habitaciones', d.habitacionId))) throw new ErrorDeshacer('La habitación ya no existe.');
    const [pagos] = await conn.query(
      'SELECT COUNT(*) AS n FROM pagos pg JOIN personas p ON p.id = pg.persona_id WHERE p.habitacion_id = ?',
      [d.habitacionId]);
    if (Number(pagos[0].n) > 0) throw new ErrorDeshacer('La habitación ya tiene pagos registrados; elimínalos primero.');
    await viajeAbiertoPorHabitacion(conn, d.habitacionId);
    await conn.query('DELETE FROM habitaciones WHERE id = ?', [d.habitacionId]);
  },

  'habitacion.editar': async (conn, d) => {
    const [rows] = await conn.query(
      'SELECT numero, tipo, total, precio_nino, etiqueta, es_stack, nota FROM habitaciones WHERE id = ?', [d.habitacionId]);
    if (!rows[0]) throw new ErrorDeshacer('La habitación ya no existe.');
    if (!mismosCampos(rows[0], d.despues)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    await viajeAbiertoPorHabitacion(conn, d.habitacionId);
    const campos = Object.keys(d.antes);
    await conn.query(
      `UPDATE habitaciones SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...campos.map((c) => d.antes[c]), d.habitacionId]);
  },

  'habitacion.eliminar': async (conn, d) => {
    const { habitacion, personas, pagos } = d.foto;
    if (await existe(conn, 'habitaciones', habitacion.id)) throw new ErrorDeshacer('La habitación ya fue restaurada.');
    if (habitacion.viaje_id) {
      if (!(await existe(conn, 'viajes', habitacion.viaje_id))) throw new ErrorDeshacer('El viaje de esta habitación ya no existe.');
      await viajeAbiertoPorViaje(conn, habitacion.viaje_id);
    }
    await conn.query(
      `INSERT INTO habitaciones (id, numero, tipo, total, precio_nino, es_stack, nota, etiqueta, viaje_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [habitacion.id, habitacion.numero, habitacion.tipo, habitacion.total, habitacion.precio_nino,
        habitacion.es_stack, habitacion.nota, habitacion.etiqueta, habitacion.viaje_id]);
    for (const p of personas) await insertarPersona(conn, p);
    for (const p of pagos) await insertarPago(conn, p);
  },

  // ── Viajes ──
  'viaje.editar': async (conn, d) => {
    const [rows] = await conn.query(
      `SELECT nombre, fecha_inicio, fecha_fin, nota, tipo, divisa, edad_minima_pago, ganancia_tipo, ganancia_valor
       FROM viajes WHERE id = ?`, [d.viajeId]);
    if (!rows[0]) throw new ErrorDeshacer('El viaje ya no existe.');
    if (!mismosCampos(rows[0], d.despues)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    await viajeAbiertoPorViaje(conn, d.viajeId);
    const campos = Object.keys(d.antes);
    await conn.query(
      `UPDATE viajes SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...campos.map((c) => d.antes[c]), d.viajeId]);
  },

  // Deshacer un cierre/reapertura: permitido aunque el viaje esté cerrado
  'viaje.estado': async (conn, d) => {
    const [rows] = await conn.query('SELECT COALESCE(estado, \'activo\') AS estado FROM viajes WHERE id = ?', [d.viajeId]);
    if (!rows[0]) throw new ErrorDeshacer('El viaje ya no existe.');
    if (!igual(rows[0].estado, d.despues)) throw new ErrorDeshacer(CAMBIO_POSTERIOR);
    await conn.query('UPDATE viajes SET estado = ?, cerrado_at = ? WHERE id = ?',
      [d.antes, fecha(d.cerradoAtAntes), d.viajeId]);
  },
};
