// Cambios "en vivo": cada vez que alguien guarda algo (POST/PUT/PATCH/DELETE que sale bien),
// se anota aquí. Las pantallas abiertas consultan /api/cambios cada pocos segundos y, si hubo
// cambios de otra persona (u otra pestaña), recargan sus datos.
// Va en la base de datos (no en memoria) para que funcione aunque el hosting corra varios procesos.
import pool from '../db.js';

const RETENCION_HORAS = 24;

/** Middleware: anota cada escritura exitosa de un usuario autenticado. */
export const anotarCambios = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.originalUrl.startsWith('/api/auth')) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.usuario) return;
    const cliente = String(req.get('x-cliente') || '').slice(0, 40) || null;
    pool.query(
      'INSERT INTO cambios (usuario, cliente, metodo, ruta) VALUES (?, ?, ?, ?)',
      [req.usuario, cliente, req.method, req.originalUrl.split('?')[0].slice(0, 200)],
    ).catch((e) => console.error('No se pudo anotar el cambio:', e.message));
  });
  next();
};

/** Borra lo de más de un día (solo sirve para avisar a las pantallas abiertas). */
export const limpiarCambios = async () => {
  try {
    await pool.query('DELETE FROM cambios WHERE created_at < NOW() - INTERVAL ? HOUR', [RETENCION_HORAS]);
  } catch (e) {
    console.error('Error limpiando cambios:', e.message);
  }
};

export const programarLimpiezaCambios = () => {
  limpiarCambios();
  setInterval(limpiarCambios, 60 * 60 * 1000).unref();
};
