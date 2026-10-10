import bcrypt from 'bcryptjs';
import pool from './db.js';

// Usuarios semilla desde SEED_USERS (JSON). Solo se insertan si no existen.
const leerUsuariosIniciales = () => {
  if (!process.env.SEED_USERS) return [];
  try {
    const usuarios = JSON.parse(process.env.SEED_USERS);
    return Array.isArray(usuarios) ? usuarios.filter((u) => u?.username && u?.password) : [];
  } catch (error) {
    console.error('SEED_USERS no es un JSON válido:', error.message);
    return [];
  }
};

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

  // Columnas agregadas con el tiempo (idempotente). Antes se ejecutaban en cada request.
  try {
    await pool.query('ALTER TABLE personas ADD COLUMN IF NOT EXISTS es_gratis TINYINT(1) NOT NULL DEFAULT 0');
  } catch (error) {
    console.error('No se pudo agregar personas.es_gratis:', error.message);
  }

  // Año de cada pago (antes solo se guardaba el mes). Los existentes toman el año de created_at.
  try {
    await pool.query('ALTER TABLE pagos ADD COLUMN IF NOT EXISTS anio SMALLINT NULL');
    await pool.query('UPDATE pagos SET anio = YEAR(COALESCE(created_at, NOW())) WHERE anio IS NULL');
  } catch (error) {
    console.error('No se pudo agregar pagos.anio:', error.message);
  }

  // Edad mínima de pago, compartir, ganancia y estado (abierto/cerrado) por viaje
  try {
    await pool.query(`
      ALTER TABLE viajes
        ADD COLUMN IF NOT EXISTS edad_minima_pago INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS token_compartir VARCHAR(100),
        ADD COLUMN IF NOT EXISTS compartir_activo TINYINT(1) DEFAULT 1,
        ADD COLUMN IF NOT EXISTS expira_compartir DATETIME NULL,
        ADD COLUMN IF NOT EXISTS tipo_compartir VARCHAR(20) DEFAULT 'completo',
        ADD COLUMN IF NOT EXISTS ganancia_tipo VARCHAR(20) NOT NULL DEFAULT 'ninguna',
        ADD COLUMN IF NOT EXISTS ganancia_valor DECIMAL(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo',
        ADD COLUMN IF NOT EXISTS cerrado_at DATETIME NULL
    `);
  } catch (error) {
    console.error('No se pudieron agregar columnas de ganancia/estado a viajes:', error.message);
  }

  for (const usuario of leerUsuariosIniciales()) {
    const passwordHash = await bcrypt.hash(usuario.password, 10);
    await pool.query(
      'INSERT IGNORE INTO usuarios (username, password_hash, nombre_display) VALUES (?, ?, ?)',
      [String(usuario.username).trim().toUpperCase(), passwordHash, usuario.nombreDisplay || usuario.username]
    );
  }
};
