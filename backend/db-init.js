import bcrypt from 'bcryptjs';
import pool from './db.js';

const USUARIOS_INICIALES = [
  { username: 'ODISLA', password: 'Odisla123*', nombreDisplay: 'Odisla' },
  { username: 'LDISLA', password: 'LDisla123*', nombreDisplay: 'Ldisla' },
  { username: 'JDELORBE', password: 'JDelOrbe*', nombreDisplay: 'JDelOrbe' },
];

export const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nombre_display VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs_actividad (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(50),
      accion VARCHAR(30),
      entidad VARCHAR(30),
      entidad_id INT NULL,
      descripcion VARCHAR(255),
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fecha (fecha)
    )
  `);

  for (const usuario of USUARIOS_INICIALES) {
    const passwordHash = await bcrypt.hash(usuario.password, 10);
    await pool.query(
      'INSERT IGNORE INTO usuarios (username, password_hash, nombre_display) VALUES (?, ?, ?)',
      [usuario.username, passwordHash, usuario.nombreDisplay]
    );
  }
};
