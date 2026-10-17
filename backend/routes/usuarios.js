// Gestión de usuarios (solo administradores): crear, editar permisos y viajes, activar/desactivar,
// restablecer contraseña. Los permisos se aplican en el servidor (ver utils/permisos.js).
import bcrypt from 'bcryptjs';
import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { registrarLog } from '../utils/log.js';
import { normalizarPermisos, invalidarUsuario, PERMISOS } from '../utils/permisos.js';

const router = asyncRouter();

const MIN_PASSWORD = 8;
const USERNAME_VALIDO = /^[A-Z0-9._-]{3,30}$/;

const ETIQUETA_PERMISO = {
  editar: 'editar', pagos: 'pagos', crear_viajes: 'gestionar viajes', reportes: 'reportes', actividad: 'actividad',
};

/** Lista de usuarios con permisos, viajes y último acceso. */
const listarUsuarios = async () => {
  const [usuarios] = await pool.query(`
    SELECT u.id, u.username, u.nombre_display AS nombreDisplay, COALESCE(u.es_admin, 0) AS esAdmin,
           COALESCE(u.activo, 1) AS activo, u.permisos, COALESCE(u.todos_viajes, 1) AS todosViajes, u.created_at AS creado,
           (SELECT MAX(l.fecha) FROM logs_actividad l WHERE l.usuario = u.username AND l.accion = 'login') AS ultimoAcceso
    FROM usuarios u ORDER BY u.es_admin DESC, u.username`);
  const [asignaciones] = await pool.query('SELECT usuario_id, viaje_id FROM usuario_viajes');
  return usuarios.map((u) => {
    let permisos;
    try { permisos = normalizarPermisos(JSON.parse(u.permisos || '{}')); } catch { permisos = normalizarPermisos({}); }
    return {
      ...u,
      esAdmin: !!u.esAdmin,
      activo: !!u.activo,
      todosViajes: !!u.todosViajes,
      permisos,
      viajes: asignaciones.filter((a) => a.usuario_id === u.id).map((a) => a.viaje_id),
    };
  });
};

/** Valida y normaliza los datos de permisos/viajes del formulario. */
const leerConfiguracion = (body) => ({
  nombreDisplay: String(body.nombreDisplay || '').trim().slice(0, 100) || null,
  esAdmin: !!body.esAdmin,
  permisos: normalizarPermisos(body.permisos),
  todosViajes: body.todosViajes !== false,
  viajes: Array.isArray(body.viajes) ? [...new Set(body.viajes.map(Number).filter(Boolean))] : [],
});

const guardarViajes = async (conn, usuarioId, viajes) => {
  await conn.query('DELETE FROM usuario_viajes WHERE usuario_id = ?', [usuarioId]);
  if (viajes.length) {
    await conn.query('INSERT INTO usuario_viajes (usuario_id, viaje_id) VALUES ?', [viajes.map((v) => [usuarioId, v])]);
  }
};

const resumenPermisos = (c) => (c.esAdmin
  ? 'administrador'
  : `${PERMISOS.filter((p) => c.permisos[p]).map((p) => ETIQUETA_PERMISO[p]).join(', ') || 'solo consulta'}; ${c.todosViajes ? 'todos los viajes' : `${c.viajes.length} viaje(s)`}`);

const adminsActivos = async (conn, excluirId = null) => {
  const [[{ n }]] = await conn.query(
    'SELECT COUNT(*) AS n FROM usuarios WHERE COALESCE(es_admin, 0) = 1 AND COALESCE(activo, 1) = 1 AND id <> ?',
    [excluirId || 0]);
  return Number(n);
};

router.get('/', async (req, res) => {
  res.json(await listarUsuarios());
});

router.post('/', async (req, res) => {
  const username = String(req.body.username || '').trim().toUpperCase();
  const password = String(req.body.password || '');
  const c = leerConfiguracion(req.body);

  if (!USERNAME_VALIDO.test(username)) {
    return res.status(400).json({ error: 'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.' });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existe] = await connection.query('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existe.length) {
      await connection.rollback();
      return res.status(409).json({ error: `Ya existe un usuario "${username}".` });
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await connection.query(
      `INSERT INTO usuarios (username, password_hash, nombre_display, es_admin, activo, permisos, todos_viajes)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [username, hash, c.nombreDisplay || username, c.esAdmin ? 1 : 0, JSON.stringify(c.permisos), c.todosViajes ? 1 : 0]);
    await guardarViajes(connection, r.insertId, c.todosViajes ? [] : c.viajes);
    await connection.commit();

    registrarLog(req.usuario, 'crear', 'usuario', r.insertId, `${req.usuario} creó el usuario ${username} (${resumenPermisos(c)})`);
    res.status(201).json((await listarUsuarios()).find((u) => u.id === r.insertId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const c = leerConfiguracion(req.body);
  const activo = req.body.activo !== false;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id, username, COALESCE(es_admin, 0) AS es_admin FROM usuarios WHERE id = ?', [id]);
    const usuario = rows[0];
    if (!usuario) {
      await connection.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    // No quedarse sin administradores ni quitarse el acceso a uno mismo
    if (id === req.auth.id && (!c.esAdmin || !activo)) {
      await connection.rollback();
      return res.status(400).json({ error: 'No puedes quitarte el rol de administrador ni desactivarte a ti mismo.' });
    }
    if (usuario.es_admin && (!c.esAdmin || !activo) && (await adminsActivos(connection, id)) === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Debe quedar al menos un administrador activo.' });
    }

    await connection.query(
      'UPDATE usuarios SET nombre_display = ?, es_admin = ?, activo = ?, permisos = ?, todos_viajes = ? WHERE id = ?',
      [c.nombreDisplay || usuario.username, c.esAdmin ? 1 : 0, activo ? 1 : 0, JSON.stringify(c.permisos), c.todosViajes ? 1 : 0, id]);
    await guardarViajes(connection, id, c.todosViajes ? [] : c.viajes);
    await connection.commit();
    invalidarUsuario(usuario.username);

    registrarLog(req.usuario, 'editar', 'usuario', id,
      `${req.usuario} actualizó al usuario ${usuario.username}: ${activo ? resumenPermisos(c) : 'desactivado'}`);
    res.json((await listarUsuarios()).find((u) => u.id === id));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.put('/:id/password', async (req, res) => {
  const id = Number(req.params.id);
  const password = String(req.body.password || '');
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
  }
  const [rows] = await pool.query('SELECT username FROM usuarios WHERE id = ?', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password, 10), id]);
  registrarLog(req.usuario, 'editar', 'usuario', id, `${req.usuario} restableció la contraseña de ${rows[0].username}`);
  res.json({ ok: true });
});

export default router;
