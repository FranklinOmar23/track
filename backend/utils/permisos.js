// Usuarios, permisos y acceso por viaje.
// - Administrador: puede todo y es el único que gestiona usuarios.
// - Resto: permisos sueltos + viajes que puede ver ("todos" o una lista).
import pool from '../db.js';

export const PERMISOS = ['editar', 'pagos', 'crear_viajes', 'reportes', 'actividad'];
export const PERMISOS_TODOS = Object.fromEntries(PERMISOS.map((p) => [p, true]));

export const MENSAJES = {
  editar: 'No tienes permiso para editar.',
  pagos: 'No tienes permiso para registrar pagos.',
  crear_viajes: 'No tienes permiso para gestionar viajes.',
  reportes: 'No tienes permiso para ver reportes.',
  actividad: 'No tienes permiso para ver la actividad.',
  admin: 'Solo un administrador puede hacer esto.',
  viaje: 'No tienes acceso a este viaje.',
};

/** Normaliza el objeto de permisos recibido (solo claves conocidas, booleanos). */
export const normalizarPermisos = (permisos = {}) =>
  Object.fromEntries(PERMISOS.map((p) => [p, !!permisos?.[p]]));

const leerPermisos = (texto) => {
  try { return normalizarPermisos(JSON.parse(texto || '{}')); } catch { return normalizarPermisos({}); }
};

// Caché corta: requireAuth corre en cada petición y no queremos ir a la BD cada vez.
const CACHE_MS = 30 * 1000;
const cache = new Map(); // username -> { perfil, expira }

export const invalidarUsuario = (username) => {
  if (username) cache.delete(String(username).toUpperCase());
  else cache.clear();
};

/** Perfil completo de un usuario (o null si no existe). */
export const cargarPerfil = async (username, { usarCache = true } = {}) => {
  const clave = String(username || '').toUpperCase();
  const guardado = cache.get(clave);
  if (usarCache && guardado && guardado.expira > Date.now()) return guardado.perfil;

  const [rows] = await pool.query(
    `SELECT id, username, nombre_display, COALESCE(es_admin, 0) AS es_admin, COALESCE(activo, 1) AS activo,
            permisos, COALESCE(todos_viajes, 1) AS todos_viajes
     FROM usuarios WHERE username = ?`, [clave]);
  const u = rows[0];
  if (!u) { cache.delete(clave); return null; }

  const [viajes] = await pool.query('SELECT viaje_id FROM usuario_viajes WHERE usuario_id = ?', [u.id]);
  const perfil = {
    id: u.id,
    username: u.username,
    nombreDisplay: u.nombre_display,
    esAdmin: !!u.es_admin,
    activo: !!u.activo,
    permisos: u.es_admin ? { ...PERMISOS_TODOS } : leerPermisos(u.permisos),
    todosViajes: !!u.es_admin || !!u.todos_viajes,
    viajes: viajes.map((v) => v.viaje_id),
  };
  cache.set(clave, { perfil, expira: Date.now() + CACHE_MS });
  return perfil;
};

export const tienePermiso = (auth, permiso) => !!auth && (auth.esAdmin || !!auth.permisos?.[permiso]);

export const puedeVerViaje = (auth, viajeId) =>
  !!auth && (auth.esAdmin || auth.todosViajes || auth.viajes.includes(Number(viajeId)));

/** null = todos los viajes; si no, la lista de ids permitidos (para filtrar consultas). */
export const viajesPermitidos = (auth) => (auth.esAdmin || auth.todosViajes ? null : auth.viajes);

/** Filtra una lista de objetos por su id de viaje. */
export const filtrarPorViaje = (auth, lista, campo = 'id') => {
  const permitidos = viajesPermitidos(auth);
  return permitidos ? lista.filter((x) => permitidos.includes(Number(x[campo]))) : lista;
};

// ── Middlewares ──
export const requierePermiso = (permiso) => (req, res, next) =>
  (tienePermiso(req.auth, permiso) ? next() : res.status(403).json({ error: MENSAJES[permiso] }));

export const requiereAdmin = (req, res, next) =>
  (req.auth?.esAdmin ? next() : res.status(403).json({ error: MENSAJES.admin }));

/** Responde 403 si el usuario no puede ver el viaje. Devuelve true si ya respondió. */
export const rechazarSinAcceso = (req, res, viajeId) => {
  if (viajeId && !puedeVerViaje(req.auth, viajeId)) {
    res.status(403).json({ error: MENSAJES.viaje });
    return true;
  }
  return false;
};

/** Si el usuario solo ve algunos viajes, el que acaba de crear se le asigna automáticamente. */
export const darAccesoAViajeNuevo = async (req, viajeId) => {
  if (req.auth.esAdmin || req.auth.todosViajes) return;
  await pool.query('INSERT IGNORE INTO usuario_viajes (usuario_id, viaje_id) VALUES (?, ?)', [req.auth.id, viajeId]);
  invalidarUsuario(req.usuario);
};
