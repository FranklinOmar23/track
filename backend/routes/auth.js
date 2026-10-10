import { asyncRouter } from '../utils/asyncRouter.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
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
      return res.status(429).json({ error: `Demasiados intentos fallidos. Intenta de nuevo en ${espera} min.` });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado en el entorno del servidor');
    }

    const usernameNormalizado = String(username).trim().toUpperCase();

    const [rows] = await pool.query(
      'SELECT username, password_hash, nombre_display FROM usuarios WHERE username = ?',
      [usernameNormalizado]
    );

    if (!rows.length) {
      registrarFallo(req, username);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      registrarFallo(req, username);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    limpiarFallos(req, username);

    const token = jwt.sign(
      { username: usuario.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    registrarLog(usuario.username, 'login', 'auth', null, `${usuario.username} inició sesión`);

    res.json({
      token,
      usuario: { username: usuario.username, nombreDisplay: usuario.nombre_display },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.usuario });
});

export default router;
