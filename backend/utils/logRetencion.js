import pool from '../db.js';

// Las acciones de usuarios (pagos, ediciones, eliminaciones, altas, movimientos) se guardan siempre:
// son el historial del dinero. Errores, arranques del servidor y logins fallidos se borran a los 90 días.
const DIAS_RETENCION = 90;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export const limpiarLogs = async () => {
  try {
    const [viejos] = await pool.query(
      `DELETE FROM logs_actividad
       WHERE accion IN ('error', 'info', 'login_fallido') AND fecha < NOW() - INTERVAL ? DAY`,
      [DIAS_RETENCION]
    );
    // Ruido que ya no se registra (sesiones vencidas, enlaces viejos, rate limit)
    const [ruido] = await pool.query(
      `DELETE FROM logs_actividad
       WHERE accion = 'error' AND entidad = 'request'
         AND (descripcion LIKE '% -> 401 |%' OR descripcion LIKE '% -> 404 |%' OR descripcion LIKE '% -> 429 |%')`
    );
    const total = viejos.affectedRows + ruido.affectedRows;
    if (total > 0) console.log(`Limpieza de logs: ${total} registros eliminados`);
  } catch (error) {
    console.error('Error limpiando logs:', error.message);
  }
};

/** Limpia al arrancar y luego una vez al día. */
export const programarLimpiezaLogs = () => {
  limpiarLogs();
  setInterval(limpiarLogs, UN_DIA_MS).unref();
};
