// Clientes: ficha de contacto, sus viajes (desde las personas enlazadas) y enlazar personas.
// Ver: permiso 'clientes'. Crear / editar / enlazar / borrar: 'clientes_editar'.
import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { requierePermiso, viajesPermitidos, puedeVerViaje, MENSAJES } from '../utils/permisos.js';
import { registrarLog } from '../utils/log.js';
import {
  normalizarCliente, aCliente, cargarParticipaciones, resumirParticipaciones, claveNombre, planImportacion,
} from '../utils/clientes.js';

const router = asyncRouter();
const puedeEditar = requierePermiso('clientes_editar');

// ── Paginación (contrato { data: { data, isThereNextPage, page, limit } }) ──
const LIMIT_DEFECTO = 100;
const LIMIT_MAXIMO = 1000;
const parsePaginacion = (q) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(LIMIT_MAXIMO, Math.max(1, parseInt(q.limit, 10) || LIMIT_DEFECTO));
  return { page, limit, offset: (page - 1) * limit };
};
const paginado = (filas, page, limit) => {
  const isThereNextPage = filas.length > limit;
  return { data: { data: isThereNextPage ? filas.slice(0, limit) : filas, isThereNextPage, page, limit } };
};
const fechaValida = (v) => (v && /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : null);
const booleano = (v) => (v === undefined || v === '' ? null : ['1', 'true', 'si', 'sí'].includes(String(v).toLowerCase()));

/** Filtros por cada propiedad de la ficha. Tipo: contains (texto parcial), eq (exacto), date (mismo día). */
const FILTROS = {
  id: ['c.id', 'eq'],
  nombre: ['c.nombre', 'contains'],
  telefono: ['c.telefono', 'contains'],
  whatsapp: ['c.whatsapp', 'contains'],
  correo: ['c.correo', 'contains'],
  documento: ['c.documento', 'contains'],
  fechaNacimiento: ['c.fecha_nacimiento', 'date'],
  ciudad: ['c.ciudad', 'contains'],
  direccion: ['c.direccion', 'contains'],
  notas: ['c.notas', 'contains'],
  esFijo: ['c.es_fijo', 'bool'],
  creadoPor: ['c.creado_por', 'contains'],
};

/**
 * GET /api/clientes — listado paginado.
 * Filtros: uno por propiedad (ver FILTROS), `q` (busca en nombre, teléfonos, cédula y correo;
 * los teléfonos se comparan solo por dígitos), `mesNacimiento` (1-12, cumpleaños del mes),
 * `fechaDesde` / `fechaHasta` (fecha de alta del cliente, inclusivas),
 * y calculados desde sus viajes: `conDeuda` (true/false) y `sinViajarDias` (N: su último viaje
 * terminó hace más de N días, o nunca ha viajado). Orden: nombre y luego id.
 */
router.get('/', requierePermiso('clientes'), async (req, res) => {
  const q = req.query;
  const { page, limit, offset } = parsePaginacion(q);
  const condiciones = [];
  const params = [];

  for (const [param, [columna, tipo]] of Object.entries(FILTROS)) {
    const valor = q[param];
    if (valor === undefined || valor === '') continue;
    if (tipo === 'contains') { condiciones.push(`${columna} LIKE ?`); params.push(`%${valor}%`); }
    if (tipo === 'eq') { condiciones.push(`${columna} = ?`); params.push(Number(valor)); }
    if (tipo === 'bool') { condiciones.push(`${columna} = ?`); params.push(booleano(valor) ? 1 : 0); }
    if (tipo === 'date') {
      const f = fechaValida(valor);
      if (!f) return res.status(400).json({ error: `${param} no es una fecha válida (AAAA-MM-DD).` });
      condiciones.push(`${columna} = ?`); params.push(f);
    }
  }

  const texto = String(q.q || '').trim();
  if (texto) {
    const digitos = texto.replace(/\D/g, '');
    const partes = ['c.nombre LIKE ?', 'c.documento LIKE ?', 'c.correo LIKE ?'];
    params.push(`%${texto}%`, `%${texto}%`, `%${texto}%`);
    if (digitos.length >= 3) {
      partes.push("REGEXP_REPLACE(COALESCE(c.telefono, ''), '[^0-9]', '') LIKE ?", "REGEXP_REPLACE(COALESCE(c.whatsapp, ''), '[^0-9]', '') LIKE ?");
      params.push(`%${digitos}%`, `%${digitos}%`);
    }
    condiciones.push(`(${partes.join(' OR ')})`);
  }

  const mes = parseInt(q.mesNacimiento, 10);
  if (mes >= 1 && mes <= 12) { condiciones.push('MONTH(c.fecha_nacimiento) = ?'); params.push(mes); }

  const desde = q.fechaDesde ? fechaValida(q.fechaDesde) : null;
  const hasta = q.fechaHasta ? fechaValida(q.fechaHasta) : null;
  if ((q.fechaDesde && !desde) || (q.fechaHasta && !hasta)) return res.status(400).json({ error: 'Rango de fechas inválido (AAAA-MM-DD).' });
  if (desde && hasta && desde > hasta) return res.status(400).json({ error: 'fechaDesde no puede ser posterior a fechaHasta.' });
  if (desde) { condiciones.push('c.created_at >= ?'); params.push(desde); }
  if (hasta) { condiciones.push('c.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(hasta); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const conDeuda = booleano(q.conDeuda);
  const sinViajarDias = parseInt(q.sinViajarDias, 10);
  const filtroCalculado = conDeuda !== null || sinViajarDias > 0;

  // Con filtros calculados (deuda, último viaje) hay que mirar las cifras de todos antes de paginar
  const [filas] = await pool.query(
    `SELECT c.* FROM clientes c ${where} ORDER BY c.nombre ASC, c.id ASC ${filtroCalculado ? '' : 'LIMIT ? OFFSET ?'}`,
    filtroCalculado ? params : [...params, limit + 1, offset]);

  const participaciones = await cargarParticipaciones(filas.map((c) => c.id), req.auth);
  let lista = filas.map((c) => ({
    ...aCliente(c),
    resumen: resumirParticipaciones(participaciones.filter((p) => p.clienteId === c.id)),
  }));

  if (filtroCalculado) {
    if (conDeuda !== null) lista = lista.filter((c) => c.resumen.conDeuda === conDeuda);
    if (sinViajarDias > 0) {
      const limite = new Date(Date.now() - sinViajarDias * 86400000).toISOString().slice(0, 10);
      lista = lista.filter((c) => !c.resumen.ultimaFecha || c.resumen.ultimaFecha < limite);
    }
    lista = lista.slice(offset, offset + limit + 1);
  }
  res.json(paginado(lista, page, limit));
});

/**
 * GET /api/clientes/posibles — personas sin cliente cuyo nombre se repite en varios viajes
 * (o coincide con un cliente que ya existe), agrupadas para enlazarlas de una vez. Paginado.
 * Filtros: `nombre` (parte del nombre), `viajeId`, `conCliente` (true: solo grupos que coinciden
 * con un cliente existente; false: solo los que no), `minViajes` (por defecto 2),
 * `fechaDesde` / `fechaHasta` (fecha de inicio del viaje). Orden: más viajes primero, luego nombre.
 */
router.get('/posibles', requierePermiso('clientes'), async (req, res) => {
  const q = req.query;
  const { page, limit, offset } = parsePaginacion(q);
  const permitidos = viajesPermitidos(req.auth);
  const condiciones = ['p.cliente_id IS NULL', "TRIM(p.nombre) <> ''"];
  const params = [];
  if (permitidos) { condiciones.push('v.id IN (?)'); params.push(permitidos.length ? permitidos : [0]); }
  if (q.viajeId) { condiciones.push('v.id = ?'); params.push(Number(q.viajeId)); }
  const desde = q.fechaDesde ? fechaValida(q.fechaDesde) : null;
  const hasta = q.fechaHasta ? fechaValida(q.fechaHasta) : null;
  if (desde && hasta && desde > hasta) return res.status(400).json({ error: 'fechaDesde no puede ser posterior a fechaHasta.' });
  if (desde) { condiciones.push('v.fecha_inicio >= ?'); params.push(desde); }
  if (hasta) { condiciones.push('v.fecha_inicio <= ?'); params.push(hasta); }

  const [[personas], [clientes]] = await Promise.all([
    pool.query(`
      SELECT p.id AS persona_id, p.nombre, p.es_nino, p.habitacion_id, h.numero,
             v.id AS viaje_id, v.nombre AS viaje, v.fecha_inicio
      FROM personas p JOIN habitaciones h ON h.id = p.habitacion_id JOIN viajes v ON v.id = h.viaje_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY v.fecha_inicio DESC, p.id`, params),
    pool.query('SELECT id, nombre, telefono FROM clientes'),
  ]);

  const clientesPorClave = new Map();
  for (const c of clientes) {
    const k = claveNombre(c.nombre);
    if (!clientesPorClave.has(k)) clientesPorClave.set(k, []);
    clientesPorClave.get(k).push({ id: c.id, nombre: c.nombre, telefono: c.telefono || '' });
  }

  const grupos = new Map();
  for (const p of personas) {
    const k = claveNombre(p.nombre);
    if (k.length < 3) continue;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(p);
  }

  const minViajes = Math.max(1, parseInt(q.minViajes, 10) || 2);
  const filtroNombre = claveNombre(q.nombre || '');
  const conCliente = booleano(q.conCliente);
  let lista = [];
  for (const [clave, miembros] of grupos) {
    const viajes = new Set(miembros.map((m) => m.viaje_id));
    const existentes = clientesPorClave.get(clave) || [];
    if (viajes.size < minViajes && !existentes.length) continue;
    if (filtroNombre && !clave.includes(filtroNombre)) continue;
    if (conCliente !== null && conCliente !== existentes.length > 0) continue;
    // El nombre que más se repite tal cual (sin la edad)
    const conteo = new Map();
    miembros.forEach((m) => {
      const n = m.nombre.replace(/\(\s*\d+\s*años?\s*\)/gi, '').trim();
      conteo.set(n, (conteo.get(n) || 0) + 1);
    });
    const nombre = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
    lista.push({
      clave,
      nombre,
      viajes: viajes.size,
      clientes: existentes,
      personas: miembros.map((m) => ({
        personaId: m.persona_id, nombre: m.nombre, esNino: !!m.es_nino,
        habitacionId: m.habitacion_id, numero: m.numero,
        viaje: { id: m.viaje_id, nombre: m.viaje, fechaInicio: m.fecha_inicio },
      })),
    });
  }
  lista.sort((a, b) => b.viajes - a.viajes || a.nombre.localeCompare(b.nombre, 'es'));
  res.json(paginado(lista.slice(offset, offset + limit + 1), page, limit));
});

/**
 * POST /api/clientes/importar — crea clientes desde los viajes: todos los adultos sin cliente que
 * tienen nombre y apellido (los niños y los nombres sueltos se omiten). El mismo nombre en varios
 * viajes queda como un solo cliente; si ya hay un cliente con ese nombre se enlazan a él.
 * Con `{ simular: true }` solo devuelve lo que haría. Se puede deshacer desde Actividad.
 */
router.post('/importar', puedeEditar, async (req, res) => {
  const simular = !!req.body?.simular;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { grupos, omitidas } = await planImportacion(connection, req.auth);
    const nuevos = grupos.filter((g) => !g.clienteId);
    const aExistentes = grupos.filter((g) => g.clienteId);
    const resumen = {
      clientesNuevos: nuevos.length,
      enlazadosAExistentes: aExistentes.length,
      personas: grupos.reduce((s, g) => s + g.personaIds.length, 0),
      variosViajes: grupos.filter((g) => g.viajes > 1).length,
      omitidas,
      ejemplos: [...grupos].sort((a, b) => b.viajes - a.viajes || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, 8).map((g) => ({ nombre: g.nombre, viajes: g.viajes, existente: !!g.clienteId })),
    };
    if (simular || !grupos.length) {
      await connection.rollback();
      return res.json({ ...resumen, simulado: true });
    }

    const creados = [];
    for (const g of nuevos) {
      const [r] = await connection.query('INSERT INTO clientes (nombre, creado_por) VALUES (?, ?)', [g.nombre, req.usuario]);
      await connection.query('UPDATE personas SET cliente_id = ? WHERE id IN (?) AND cliente_id IS NULL', [r.insertId, g.personaIds]);
      creados.push({ clienteId: r.insertId, personaIds: g.personaIds });
    }
    const enlazados = [];
    for (const g of aExistentes) {
      await connection.query('UPDATE personas SET cliente_id = ? WHERE id IN (?) AND cliente_id IS NULL', [g.clienteId, g.personaIds]);
      enlazados.push({ clienteId: g.clienteId, personaIds: g.personaIds });
    }
    await connection.commit();

    registrarLog(req.usuario, 'crear', 'cliente', null,
      `${req.usuario} creó ${creados.length} cliente(s) desde los viajes${enlazados.length ? ` y enlazó viajes a ${enlazados.length} cliente(s) existentes` : ''} (${resumen.personas} persona(s))`,
      { op: 'cliente.importar', creados, enlazados });
    res.json({ ...resumen, simulado: false });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
});

const leerCliente = async (conn, id) => {
  const [rows] = await conn.query('SELECT * FROM clientes WHERE id = ?', [id]);
  return rows[0] || null;
};

/** Personas que el usuario puede enlazar (existen y son de viajes que puede ver). */
const personasEnlazables = async (req, ids) => {
  const lista = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Boolean))];
  if (!lista.length) return { personas: [] };
  const [rows] = await pool.query(`
    SELECT p.id, p.nombre, p.cliente_id, h.viaje_id FROM personas p
    JOIN habitaciones h ON h.id = p.habitacion_id WHERE p.id IN (?)`, [lista]);
  if (rows.length !== lista.length) return { error: 'Alguna de las personas ya no existe.', status: 404 };
  if (rows.some((r) => r.viaje_id && !puedeVerViaje(req.auth, r.viaje_id))) return { error: MENSAJES.viaje, status: 403 };
  return { personas: rows };
};

/** GET /api/clientes/:id — ficha completa con sus viajes. */
router.get('/:id', requierePermiso('clientes'), async (req, res) => {
  const cliente = await leerCliente(pool, Number(req.params.id));
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const participaciones = await cargarParticipaciones([cliente.id], req.auth);
  const fecha = (p) => p.viaje.fechaInicio || '';
  participaciones.sort((a, b) => fecha(b).localeCompare(fecha(a)) || b.personaId - a.personaId);
  res.json({ ...aCliente(cliente), resumen: resumirParticipaciones(participaciones), participaciones });
});

/** POST /api/clientes — crea la ficha; `personaIds` (opcional) la enlaza de una vez. */
router.post('/', puedeEditar, async (req, res) => {
  const { datos, error } = normalizarCliente(req.body);
  if (error) return res.status(400).json({ error });
  const enlazar = await personasEnlazables(req, req.body.personaIds);
  if (enlazar.error) return res.status(enlazar.status).json({ error: enlazar.error });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const columnas = Object.keys(datos);
    const [r] = await connection.query(
      `INSERT INTO clientes (${columnas.join(', ')}, creado_por) VALUES (${columnas.map(() => '?').join(', ')}, ?)`,
      [...columnas.map((c) => datos[c]), req.usuario]);
    const ids = enlazar.personas.map((p) => p.id);
    if (ids.length) await connection.query('UPDATE personas SET cliente_id = ? WHERE id IN (?)', [r.insertId, ids]);
    await connection.commit();

    registrarLog(req.usuario, 'crear', 'cliente', r.insertId,
      `${req.usuario} creó el cliente ${datos.nombre}${ids.length ? ` y le enlazó ${ids.length} viaje(s)` : ''}`,
      { op: 'cliente.crear', clienteId: r.insertId, personas: enlazar.personas.map((p) => ({ id: p.id, antes: p.cliente_id })) });
    res.status(201).json(aCliente(await leerCliente(pool, r.insertId)));
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
});

/** PUT /api/clientes/:id — edita la ficha (solo los campos enviados). */
router.put('/:id', puedeEditar, async (req, res) => {
  const id = Number(req.params.id);
  const antes = await leerCliente(pool, id);
  if (!antes) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const { datos, error } = normalizarCliente(req.body, { parcial: true });
  if (error) return res.status(400).json({ error });
  const columnas = Object.keys(datos).filter((c) => String(datos[c] ?? '') !== String(antes[c] ?? ''));
  if (!columnas.length) return res.json(aCliente(antes));

  await pool.query(
    `UPDATE clientes SET ${columnas.map((c) => `${c} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
    [...columnas.map((c) => datos[c]), id]);
  const ETIQUETAS = {
    nombre: 'nombre', telefono: 'teléfono', whatsapp: 'WhatsApp', correo: 'correo', documento: 'documento',
    fecha_nacimiento: 'nacimiento', ciudad: 'ciudad', direccion: 'dirección', notas: 'notas', es_fijo: 'fijo',
  };
  const valor = (c, v) => (c === 'es_fijo' ? (Number(v) ? 'sí' : 'no') : (v ?? '—'));
  const cambios = columnas.map((c) => (c === 'notas' ? 'notas' : `${ETIQUETAS[c]}: ${valor(c, antes[c])} → ${valor(c, datos[c])}`));
  registrarLog(req.usuario, 'editar', 'cliente', id,
    `${req.usuario} editó el cliente ${datos.nombre || antes.nombre} (${cambios.join(', ')})`,
    {
      op: 'cliente.editar', clienteId: id,
      antes: Object.fromEntries(columnas.map((c) => [c, antes[c] ?? null])),
      despues: Object.fromEntries(columnas.map((c) => [c, datos[c] ?? null])),
    });
  res.json(aCliente(await leerCliente(pool, id)));
});

/** DELETE /api/clientes/:id — borra la ficha; sus personas siguen en los viajes, sin enlace. */
router.delete('/:id', puedeEditar, async (req, res) => {
  const id = Number(req.params.id);
  const cliente = await leerCliente(pool, id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const [personas] = await pool.query('SELECT id FROM personas WHERE cliente_id = ?', [id]);
  await pool.query('DELETE FROM clientes WHERE id = ?', [id]);
  registrarLog(req.usuario, 'eliminar', 'cliente', id,
    `${req.usuario} eliminó el cliente ${cliente.nombre}${personas.length ? ` (tenía ${personas.length} viaje(s) enlazados)` : ''}`,
    { op: 'cliente.eliminar', cliente, personaIds: personas.map((p) => p.id) });
  res.json({ ok: true });
});

/** POST /api/clientes/:id/vincular — enlaza personas de habitaciones a este cliente. */
router.post('/:id/vincular', puedeEditar, async (req, res) => {
  const id = Number(req.params.id);
  const cliente = await leerCliente(pool, id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const enlazar = await personasEnlazables(req, req.body.personaIds);
  if (enlazar.error) return res.status(enlazar.status).json({ error: enlazar.error });
  const cambiar = enlazar.personas.filter((p) => p.cliente_id !== id);
  if (!cambiar.length) return res.json({ ok: true, enlazadas: 0 });

  await pool.query('UPDATE personas SET cliente_id = ? WHERE id IN (?)', [id, cambiar.map((p) => p.id)]);
  const nombres = [...new Set(cambiar.map((p) => p.nombre))].join(', ');
  registrarLog(req.usuario, 'editar', 'cliente', id,
    `${req.usuario} enlazó a ${nombres} con el cliente ${cliente.nombre} (${cambiar.length} viaje(s))`,
    { op: 'cliente.vincular', clienteId: id, personas: cambiar.map((p) => ({ id: p.id, antes: p.cliente_id })) });
  res.json({ ok: true, enlazadas: cambiar.length });
});

/**
 * POST /api/clientes/:id/unir { otroId } — junta dos fichas de la misma persona: los viajes del otro
 * pasan a este, los datos que aquí estén vacíos se toman del otro (las notas se suman) y el otro se borra.
 */
router.post('/:id/unir', puedeEditar, async (req, res) => {
  const id = Number(req.params.id);
  const otroId = Number(req.body?.otroId);
  if (!otroId || otroId === id) return res.status(400).json({ error: 'Elige otro cliente para unir.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [filas] = await connection.query('SELECT * FROM clientes WHERE id IN (?) FOR UPDATE', [[id, otroId]]);
    const cliente = filas.find((f) => f.id === id);
    const otro = filas.find((f) => f.id === otroId);
    if (!cliente || !otro) {
      await connection.rollback();
      return res.status(404).json({ error: 'Alguno de los dos clientes ya no existe.' });
    }

    const vacio = (v) => v === null || v === undefined || String(v).trim() === '';
    const cambios = {};
    for (const c of ['telefono', 'whatsapp', 'correo', 'documento', 'fecha_nacimiento', 'ciudad', 'direccion']) {
      if (vacio(cliente[c]) && !vacio(otro[c])) cambios[c] = otro[c];
    }
    if (!vacio(otro.notas) && String(otro.notas).trim() !== String(cliente.notas || '').trim()) {
      cambios.notas = vacio(cliente.notas) ? otro.notas : `${cliente.notas}\n\n${otro.notas}`.slice(0, 5000);
    }
    if (otro.es_fijo && !cliente.es_fijo) cambios.es_fijo = 1;
    const columnas = Object.keys(cambios);
    const antes = Object.fromEntries(columnas.map((c) => [c, cliente[c] ?? null]));
    if (columnas.length) {
      await connection.query(`UPDATE clientes SET ${columnas.map((c) => `${c} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
        [...columnas.map((c) => cambios[c]), id]);
    }
    const [personas] = await connection.query('SELECT id FROM personas WHERE cliente_id = ?', [otroId]);
    const personaIds = personas.map((p) => p.id);
    if (personaIds.length) await connection.query('UPDATE personas SET cliente_id = ? WHERE id IN (?)', [id, personaIds]);
    await connection.query('DELETE FROM clientes WHERE id = ?', [otroId]);
    await connection.commit();

    registrarLog(req.usuario, 'editar', 'cliente', id,
      `${req.usuario} unió al cliente ${otro.nombre} con ${cliente.nombre} (${personaIds.length} viaje(s) movidos)`,
      { op: 'cliente.unir', clienteId: id, otro, personaIds, antes, despues: cambios });
    res.json({ ok: true, movidas: personaIds.length, cliente: aCliente(await leerCliente(pool, id)) });
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
});

/** DELETE /api/clientes/:id/personas/:personaId — quita el enlace de una persona con el cliente. */
router.delete('/:id/personas/:personaId', puedeEditar, async (req, res) => {
  const id = Number(req.params.id);
  const personaId = Number(req.params.personaId);
  const cliente = await leerCliente(pool, id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const enlazar = await personasEnlazables(req, [personaId]);
  if (enlazar.error) return res.status(enlazar.status).json({ error: enlazar.error });
  const persona = enlazar.personas[0];
  if (persona.cliente_id !== id) return res.status(409).json({ error: 'Esa persona no está enlazada a este cliente.' });

  await pool.query('UPDATE personas SET cliente_id = NULL WHERE id = ?', [personaId]);
  registrarLog(req.usuario, 'editar', 'cliente', id,
    `${req.usuario} quitó a ${persona.nombre} del cliente ${cliente.nombre}`,
    { op: 'cliente.desvincular', clienteId: id, personaId });
  res.json({ ok: true });
});

export default router;
