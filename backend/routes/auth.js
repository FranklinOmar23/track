import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { registrarLog } from '../utils/log.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }

  const usernameNormalizado = String(username).trim().toUpperCase();

  const [rows] = await pool.query(
    'SELECT username, password_hash, nombre_display FROM usuarios WHERE username = ?',
    [usernameNormalizado]
  );

  if (!rows.length) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const usuario = rows[0];
  const passwordValida = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValida) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

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
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.usuario });
});

export default router;
