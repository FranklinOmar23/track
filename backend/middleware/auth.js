import jwt from 'jsonwebtoken';
import { cargarPerfil } from '../utils/permisos.js';

/** Verifica el token y carga el perfil (permisos y viajes) en req.auth. */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const perfil = await cargarPerfil(payload.username);
    // Usuario borrado o desactivado: la sesión deja de valer aunque el token no haya vencido
    if (!perfil || !perfil.activo) return res.status(401).json({ error: 'No autorizado' });
    req.usuario = perfil.username;
    req.auth = perfil;
    next();
  } catch (error) {
    next(error);
  }
};
