// Clientes: enlace con las personas de las habitaciones y cifras calculadas desde ellas.
// Lo que un cliente pagó o debe nunca se guarda en la ficha: se calcula de sus personas
// enlazadas con las mismas reglas de cobro que el resto del sistema (utils/totales.js).
import pool from '../db.js';
import { cuotasHabitacion, redondear } from './totales.js';
import { tienePermiso, viajesPermitidos } from './permisos.js';

/** Campos editables de la ficha: nombre en la API → columna. */
export const CAMPOS_CLIENTE = {
  nombre: 'nombre',
  telefono: 'telefono',
  whatsapp: 'whatsapp',
  correo: 'correo',
  documento: 'documento',
  fechaNacimiento: 'fecha_nacimiento',
  ciudad: 'ciudad',
  direccion: 'direccion',
  notas: 'notas',
  esFijo: 'es_fijo',
};

const LARGOS = { nombre: 150, telefono: 40, whatsapp: 40, correo: 150, documento: 40, ciudad: 100, direccion: 255, notas: 5000 };

/** Valida el cuerpo de una ficha. Con `parcial` solo revisa los campos que vienen. Devuelve { error } o { datos }. */
export const normalizarCliente = (body = {}, { parcial = false } = {}) => {
  const datos = {};
  for (const campo of Object.keys(CAMPOS_CLIENTE)) {
    if (parcial && !(campo in body)) continue;
    const valor = body[campo];
    if (campo === 'esFijo') { datos.es_fijo = valor ? 1 : 0; continue; }
    if (campo === 'fechaNacimiento') {
      if (valor === null || valor === undefined || valor === '') { datos.fecha_nacimiento = null; continue; }
      const f = String(valor).slice(0, 10);
      const d = new Date(`${f}T00:00:00Z`);
      // Además del formato, la fecha debe existir (sin 30 de febrero) y no ser futura
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== f || d > new Date()) {
        return { error: 'Fecha de nacimiento inválida.' };
      }
      datos.fecha_nacimiento = f;
      continue;
    }
    const texto = String(valor ?? '').trim().slice(0, LARGOS[campo]);
    datos[CAMPOS_CLIENTE[campo]] = texto || null;
  }
  if ((!parcial || 'nombre' in body) && !datos.nombre) return { error: 'El nombre es obligatorio.' };
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) return { error: 'El correo no es válido.' };
  return { datos };
};

/** Fila de la BD → objeto de la API. */
export const aCliente = (c) => ({
  id: c.id,
  nombre: c.nombre,
  telefono: c.telefono || '',
  whatsapp: c.whatsapp || '',
  correo: c.correo || '',
  documento: c.documento || '',
  fechaNacimiento: c.fecha_nacimiento || null,
  ciudad: c.ciudad || '',
  direccion: c.direccion || '',
  notas: c.notas || '',
  esFijo: !!c.es_fijo,
  creadoPor: c.creado_por || null,
  createdAt: c.created_at,
  updatedAt: c.updated_at || null,
});

/**
 * Cliente con el que se puede enlazar una persona nueva, o null.
 * Solo se enlaza si quien registra puede ver clientes y el cliente existe.
 */
export const clienteParaEnlazar = async (conn, auth, clienteId) => {
  const id = Number(clienteId);
  if (!id || !tienePermiso(auth, 'clientes')) return null;
  const [rows] = await conn.query('SELECT id FROM clientes WHERE id = ?', [id]);
  return rows[0] ? id : null;
};

/** "María  Pérez (8 años)" → "maria perez": para encontrar el mismo nombre escrito distinto. */
export const claveNombre = (nombre) => String(nombre || '')
  .replace(/\(\s*\d+\s*años?\s*\)/gi, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-zñ0-9 ]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const RE_EDAD = /\(\s*\d+\s*años?\s*\)/i;
// Nombres de relleno que no son una persona real ("Persona 2", "Acompañante", "Por definir"…)
const GENERICOS = new Set(['persona', 'adulto', 'adulta', 'acompanante', 'invitado', 'invitada', 'pendiente',
  'por', 'sin', 'nombre', 'cliente', 'nino', 'nina', 'bebe', 'huesped', 'tbd', 'na', 'xx', 'xxx', 'otro', 'otra']);

/** true si el nombre tiene nombre y apellido (dos palabras de 2+ letras) y no es de relleno. */
export const tieneNombreYApellido = (nombre) => {
  const palabras = claveNombre(nombre).split(' ').filter((w) => w.length >= 2 && /[a-zñ]/.test(w) && !/\d/.test(w));
  return palabras.length >= 2 && !GENERICOS.has(palabras[0]) && !GENERICOS.has(palabras[1]);
};

/**
 * Plan para crear clientes desde los viajes: adultos sin cliente con nombre y apellido,
 * agrupados por nombre (el mismo nombre en varios viajes = un solo cliente). Si ya existe
 * un cliente con ese nombre se enlazan a él; si hay varios con el mismo nombre no se toca.
 */
export const planImportacion = async (conn, auth) => {
  const permitidos = viajesPermitidos(auth);
  const [personas] = await conn.query(`
    SELECT p.id, p.nombre, COALESCE(p.es_nino, 0) AS es_nino, h.viaje_id
    FROM personas p JOIN habitaciones h ON h.id = p.habitacion_id
    WHERE p.cliente_id IS NULL ${permitidos ? 'AND h.viaje_id IN (?)' : ''}
    ORDER BY p.id`, permitidos ? [permitidos.length ? permitidos : [0]] : []);
  const [clientes] = await conn.query('SELECT id, nombre FROM clientes');
  const existentes = new Map();
  for (const c of clientes) {
    const k = claveNombre(c.nombre);
    existentes.set(k, [...(existentes.get(k) || []), c]);
  }

  const omitidas = { ninos: 0, sinApellido: 0, repetidosEnClientes: 0 };
  const grupos = new Map();
  for (const p of personas) {
    if (p.es_nino || RE_EDAD.test(p.nombre || '')) { omitidas.ninos += 1; continue; }
    if (!tieneNombreYApellido(p.nombre)) { omitidas.sinApellido += 1; continue; }
    const k = claveNombre(p.nombre);
    if ((existentes.get(k) || []).length > 1) { omitidas.repetidosEnClientes += 1; continue; }
    if (!grupos.has(k)) grupos.set(k, { clave: k, personas: [], viajes: new Set(), nombres: new Map() });
    const g = grupos.get(k);
    g.personas.push(p.id);
    g.viajes.add(p.viaje_id);
    const n = p.nombre.trim().replace(/\s+/g, ' ');
    g.nombres.set(n, (g.nombres.get(n) || 0) + 1);
  }

  return {
    grupos: [...grupos.values()].map((g) => {
      const cliente = (existentes.get(g.clave) || [])[0] || null;
      return {
        // El nombre que más se repite tal como se escribió
        nombre: cliente ? cliente.nombre : [...g.nombres.entries()].sort((a, b) => b[1] - a[1])[0][0].slice(0, 150),
        clienteId: cliente ? cliente.id : null,
        personaIds: g.personas,
        viajes: g.viajes.size,
      };
    }),
    omitidas,
  };
};

/**
 * Participaciones de los clientes en viajes: una por cada persona enlazada, con su cuota,
 * lo pagado y lo pendiente. Solo viajes que el usuario puede ver.
 */
export const cargarParticipaciones = async (clienteIds, auth) => {
  if (!clienteIds.length) return [];
  const permitidos = viajesPermitidos(auth);
  const [vinculadas] = await pool.query(`
    SELECT p.id AS persona_id, p.cliente_id, p.habitacion_id, p.nombre,
           h.numero, h.etiqueta,
           v.id AS viaje_id, v.nombre AS viaje, v.slug, COALESCE(v.tipo, 'resort') AS tipo,
           v.fecha_inicio, v.fecha_fin, COALESCE(v.divisa, 'USD') AS divisa, COALESCE(v.estado, 'activo') AS estado
    FROM personas p
    JOIN habitaciones h ON h.id = p.habitacion_id
    JOIN viajes v ON v.id = h.viaje_id
    WHERE p.cliente_id IN (?) ${permitidos ? 'AND v.id IN (?)' : ''}`,
  permitidos ? [clienteIds, permitidos.length ? permitidos : [0]] : [clienteIds]);
  if (!vinculadas.length) return [];

  // Para la cuota de cada uno hace falta la habitación completa (cuántos adultos la comparten)
  const habIds = [...new Set(vinculadas.map((r) => r.habitacion_id))];
  const [filas] = await pool.query(`
    SELECT h.id AS habitacion_id, h.total, h.precio_nino, h.es_stack AS hab_stack,
           COALESCE(v.edad_minima_pago, 0) AS edad_minima_pago,
           p.id AS persona_id, p.nombre, p.posicion, p.es_nino,
           COALESCE(p.es_gratis, 0) AS es_gratis, COALESCE(p.es_stack, 0) AS es_stack,
           COALESCE(pg.pagado, 0) AS pagado
    FROM habitaciones h
    LEFT JOIN viajes v ON v.id = h.viaje_id
    JOIN personas p ON p.habitacion_id = h.id
    LEFT JOIN (
      SELECT persona_id, SUM(monto) AS pagado FROM pagos
      WHERE persona_id IN (SELECT id FROM personas WHERE habitacion_id IN (?))
      GROUP BY persona_id
    ) pg ON pg.persona_id = p.id
    WHERE h.id IN (?)`, [habIds, habIds]);

  const habitaciones = new Map();
  for (const f of filas) {
    if (!habitaciones.has(f.habitacion_id)) {
      habitaciones.set(f.habitacion_id, {
        total: Number(f.total), precioNino: Number(f.precio_nino), stack: !!f.hab_stack,
        edadMinimaPago: Number(f.edad_minima_pago), personas: [],
      });
    }
    habitaciones.get(f.habitacion_id).personas.push({
      id: f.persona_id, nombre: f.nombre, posicion: f.posicion, esNino: !!f.es_nino,
      esGratis: !!f.es_gratis, esStack: !!f.es_stack, pagado: Number(f.pagado),
    });
  }
  const cuotas = new Map();
  for (const hab of habitaciones.values()) {
    const titular = hab.personas.reduce((m, p) => (m === null || p.posicion < m ? p.posicion : m), null);
    for (const c of cuotasHabitacion(hab, hab.edadMinimaPago)) {
      cuotas.set(c.id, { cuota: c.cuota, paga: c.paga, pagado: c.pagado, titular: c.posicion === titular, esNino: c.esNino });
    }
  }

  return vinculadas.map((r) => {
    const c = cuotas.get(r.persona_id) || { cuota: 0, paga: false, pagado: 0, titular: false };
    return {
      personaId: r.persona_id,
      clienteId: r.cliente_id,
      nombre: r.nombre,
      habitacionId: r.habitacion_id,
      numero: r.numero,
      etiqueta: r.etiqueta || '',
      titular: c.titular,
      esNino: !!c.esNino,
      paga: c.paga,
      cuota: redondear(c.cuota),
      pagado: redondear(c.pagado),
      pendiente: redondear(Math.max(0, c.cuota - c.pagado)),
      viaje: {
        id: r.viaje_id, nombre: r.viaje, slug: r.slug, tipo: r.tipo,
        fechaInicio: r.fecha_inicio, fechaFin: r.fecha_fin, divisa: r.divisa, estado: r.estado,
      },
    };
  });
};

/** Resumen de un cliente a partir de sus participaciones (los montos se separan por divisa). */
export const resumirParticipaciones = (participaciones) => {
  const porDivisa = new Map();
  const viajes = new Map();
  for (const p of participaciones) {
    const d = porDivisa.get(p.viaje.divisa) || { divisa: p.viaje.divisa, cuota: 0, pagado: 0, pendiente: 0 };
    d.cuota += p.cuota; d.pagado += p.pagado; d.pendiente += p.pendiente;
    porDivisa.set(p.viaje.divisa, d);
    viajes.set(p.viaje.id, p.viaje);
  }
  const fechaDe = (v) => v.fechaFin || v.fechaInicio || '';
  const ordenados = [...viajes.values()].sort((a, b) => fechaDe(b).localeCompare(fechaDe(a)));
  const hoy = new Date().toISOString().slice(0, 10);
  const pasados = ordenados.filter((v) => fechaDe(v) && fechaDe(v) < hoy);
  const proximos = ordenados.filter((v) => (v.fechaInicio || '') >= hoy).reverse();
  return {
    viajes: viajes.size,
    totales: [...porDivisa.values()].map((d) => ({
      divisa: d.divisa, cuota: redondear(d.cuota), pagado: redondear(d.pagado), pendiente: redondear(d.pendiente),
    })),
    conDeuda: participaciones.some((p) => p.pendiente > 0.009),
    ultimoViaje: pasados[0] ? { id: pasados[0].id, nombre: pasados[0].nombre, fecha: fechaDe(pasados[0]) } : null,
    proximoViaje: proximos[0] ? { id: proximos[0].id, nombre: proximos[0].nombre, fecha: proximos[0].fechaInicio } : null,
    // Fecha del último viaje que ya pasó o del que tiene en curso/próximo (para "sin viajar hace…")
    ultimaFecha: ordenados[0] ? fechaDe(ordenados[0]) : null,
  };
};
