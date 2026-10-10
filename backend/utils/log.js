import pool from '../db.js';

const MAX_DESCRIPCION = 500;

/**
 * Registra una acción en logs_actividad.
 * `deshacer` (opcional) guarda lo necesario para revertir la acción: { op, ...datos }.
 * Ver utils/deshacer.js para las operaciones soportadas.
 */
export const registrarLog = async (usuario, accion, entidad, entidadId, descripcion, deshacer = null) => {
  try {
    await pool.query(
      'INSERT INTO logs_actividad (usuario, accion, entidad, entidad_id, descripcion, deshacer) VALUES (?, ?, ?, ?, ?, ?)',
      [
        usuario || null,
        accion,
        entidad,
        entidadId ?? null,
        String(descripcion || '').slice(0, MAX_DESCRIPCION),
        deshacer ? JSON.stringify(deshacer) : null,
      ]
    );
  } catch (error) {
    console.error('Error registrando log de actividad:', error.message);
  }
};

export const registrarError = async (error, context = {}) => {
  try {
    const descripcionBase = context.descripcion || 'Error inesperado del backend';
    const mensaje = error instanceof Error ? error.message : String(error);
    const detalle = context.detalle || mensaje;
    const descripcion = `${descripcionBase}${detalle ? ` | ${detalle}` : ''}`;

    await registrarLog(
      context.usuario || 'sistema',
      context.accion || 'error',
      context.entidad || 'server',
      context.entidadId ?? null,
      descripcion
    );
  } catch (loggingError) {
    console.error('No se pudo registrar el error en la base de datos:', loggingError.message);
  }
};
