import pool from '../db.js';

export const registrarLog = async (usuario, accion, entidad, entidadId, descripcion) => {
  try {
    await pool.query(
      'INSERT INTO logs_actividad (usuario, accion, entidad, entidad_id, descripcion) VALUES (?, ?, ?, ?, ?)',
      [usuario || null, accion, entidad, entidadId ?? null, descripcion]
    );
  } catch (error) {
    console.error('Error registrando log de actividad:', error.message);
  }
};
