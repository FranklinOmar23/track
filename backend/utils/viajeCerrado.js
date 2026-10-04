import pool from '../db.js';

export const MENSAJE_VIAJE_CERRADO =
  'Este viaje está cerrado: solo se puede consultar. Reábrelo para hacer cambios.';

const estaCerrado = async (sql, params) => {
  const [rows] = await pool.query(sql, params);
  return rows[0]?.estado === 'cerrado';
};

const SQL_VIAJE = 'SELECT estado FROM viajes WHERE id = ?';
const SQL_HABITACION = `
  SELECT v.estado FROM habitaciones h
  JOIN viajes v ON v.id = h.viaje_id
  WHERE h.id = ?`;
const SQL_PERSONA = `
  SELECT v.estado FROM personas p
  JOIN habitaciones h ON h.id = p.habitacion_id
  JOIN viajes v ON v.id = h.viaje_id
  WHERE p.id = ?`;

/** Middleware: responde 409 si el viaje resuelto por `resolver(req)` está cerrado. */
const bloquearSiCerrado = (resolver) => async (req, res, next) => {
  if (await resolver(req)) {
    return res.status(409).json({ error: MENSAJE_VIAJE_CERRADO });
  }
  next();
};

export const viajeParamAbierto = bloquearSiCerrado((req) =>
  estaCerrado(SQL_VIAJE, [Number(req.params.id)])
);

export const viajeBodyAbierto = bloquearSiCerrado((req) =>
  req.body.viajeId ? estaCerrado(SQL_VIAJE, [Number(req.body.viajeId)]) : false
);

export const habitacionParamAbierta = bloquearSiCerrado((req) =>
  estaCerrado(SQL_HABITACION, [Number(req.params.id)])
);

export const personaParamAbierta = bloquearSiCerrado((req) =>
  estaCerrado(SQL_PERSONA, [Number(req.params.id)])
);

// Mover persona: ni el viaje de origen ni el de destino pueden estar cerrados
export const movimientoAbierto = bloquearSiCerrado(async (req) =>
  (await estaCerrado(SQL_PERSONA, [Number(req.body.personaId)])) ||
  (await estaCerrado(SQL_HABITACION, [Number(req.body.destinoHabitacionId)]))
);
