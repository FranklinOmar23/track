import { asyncRouter } from '../utils/asyncRouter.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { cargarPerfil } from '../utils/permisos.js';
import { registrarLog } from '../utils/log.js';
import { minutosBloqueado, registrarFallo, limpiarFallos } from '../utils/limiteLogin.js';

const router = asyncRouter();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const espera = minutosBloqueado(req, username);
    if (espera > 0) {
      registrarLog(String(username).trim().toUpperCase(), 'login_fallido', 'auth', null, `Login bloqueado por demasiados intentos (${espera} min restantes)`);
      return res.status(429).json({ error: `Demasiados intentos fallidos. Intenta de nuevo en ${espera} min.` });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado en el entorno del servidor');
    }

    const usernameNormalizado = String(username).trim().toUpperCase();

    const [rows] = await pool.query(
      'SELECT username, password_hash, nombre_display, COALESCE(activo, 1) AS activo FROM usuarios WHERE username = ?',
      [usernameNormalizado]
    );

    if (!rows.length) {
      registrarFallo(req, username);
      registrarLog(usernameNormalizado, 'login_fallido', 'auth', null, `Intento de inicio de sesión fallido para "${usernameNormalizado}"`);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      registrarFallo(req, username);
      registrarLog(usernameNormalizado, 'login_fallido', 'auth', null, `Intento de inicio de sesión fallido para "${usernameNormalizado}"`);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    limpiarFallos(req, username);

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Este usuario está desactivado. Habla con el administrador.' });
    }

    const token = jwt.sign(
      { username: usuario.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    registrarLog(usuario.username, 'login', 'auth', null, `${usuario.username} inició sesión`);

    res.json({ token, usuario: await cargarPerfil(usuario.username, { usarCache: false }) });
  } catch (err) {
    next(err);
  }
});

// Perfil del usuario actual (permisos y viajes): el frontend lo refresca al abrir la app
router.get('/me', requireAuth, (req, res) => {
  res.json(req.auth);
});

// Cambiar la propia contraseña
router.put('/password', requireAuth, async (req, res) => {
  const actual = String(req.body.actual || '');
  const nueva = String(req.body.nueva || '');
  if (nueva.length < 8) return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres.' });
  const [rows] = await pool.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.auth.id]);
  if (!rows[0] || !(await bcrypt.compare(actual, rows[0].password_hash))) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
  }
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [await bcrypt.hash(nueva, 10), req.auth.id]);
  registrarLog(req.usuario, 'editar', 'usuario', req.auth.id, `${req.usuario} cambió su contraseña`);
  res.json({ ok: true });
});

export default router;
