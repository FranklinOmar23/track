// Guardas de escritura: permiso del usuario + acceso al viaje + viaje no cerrado.
import pool from '../db.js';
import { tienePermiso, puedeVerViaje, MENSAJES } from './permisos.js';

export const MENSAJE_VIAJE_CERRADO =
  'Este viaje está cerrado: solo se puede consultar. Reábrelo para hacer cambios.';

const SQL_VIAJE = 'SELECT id AS viaje_id, estado FROM viajes WHERE id = ?';
const SQL_HABITACION = `
  SELECT v.id AS viaje_id, v.estado FROM habitaciones h
  JOIN viajes v ON v.id = h.viaje_id
  WHERE h.id = ?`;
const SQL_PERSONA = `
  SELECT v.id AS viaje_id, v.estado FROM personas p
  JOIN habitaciones h ON h.id = p.habitacion_id
  JOIN viajes v ON v.id = h.viaje_id
  WHERE p.id = ?`;

const viajeDe = async (sql, id) => {
  const [rows] = await pool.query(sql, [Number(id)]);
  return rows[0] || null;
};

/**
 * Middleware genérico. `resolver(req)` devuelve la lista de viajes afectados ({ viaje_id, estado }).
 * Verifica permiso, acceso a cada viaje y (si `permitirCerrado` es falso) que ninguno esté cerrado.
 */
const guarda = (permiso, resolver, { permitirCerrado = false } = {}) => async (req, res, next) => {
  if (!tienePermiso(req.auth, permiso)) return res.status(403).json({ error: MENSAJES[permiso] });
  const viajes = (await resolver(req)).filter(Boolean);
  if (viajes.some((v) => !puedeVerViaje(req.auth, v.viaje_id))) return res.status(403).json({ error: MENSAJES.viaje });
  if (!permitirCerrado && viajes.some((v) => v.estado === 'cerrado')) {
    return res.status(409).json({ error: MENSAJE_VIAJE_CERRADO });
  }
  next();
};

export const viajeEditable = (permiso = 'editar', opciones) =>
  guarda(permiso, async (req) => [await viajeDe(SQL_VIAJE, req.params.id)], opciones);

export const viajeBodyEditable = (permiso = 'editar') =>
  guarda(permiso, async (req) => (req.body.viajeId ? [await viajeDe(SQL_VIAJE, req.body.viajeId)] : []));

export const habitacionEditable = (permiso = 'editar') =>
  guarda(permiso, async (req) => [await viajeDe(SQL_HABITACION, req.params.id)]);

export const personaEditable = (permiso = 'editar') =>
  guarda(permiso, async (req) => [await viajeDe(SQL_PERSONA, req.params.id)]);

// Mover persona: hay que poder editar tanto el viaje de origen como el de destino
export const movimientoEditable = (permiso = 'editar') =>
  guarda(permiso, async (req) => [
    await viajeDe(SQL_PERSONA, req.body.personaId),
    await viajeDe(SQL_HABITACION, req.body.destinoHabitacionId),
  ]);
