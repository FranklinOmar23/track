import bcrypt from 'bcryptjs';
import pool from './db.js';
import { PERMISOS_TODOS } from './utils/permisos.js';

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

  // habitaciones.tipo era enum('Doble','Triple') sin 'Single': MySQL (sin modo estricto) guardaba ''.
  // Se agrega 'Single' y se reparan las vacías con la misma regla de la app (adultos: 0-1 Single, 2 Doble, 3+ Triple).
  try {
    await pool.query("ALTER TABLE habitaciones MODIFY tipo ENUM('Single', 'Doble', 'Triple') NOT NULL DEFAULT 'Doble'");
    const [reparadas] = await pool.query(`
      UPDATE habitaciones h
      SET h.tipo = CASE
        WHEN (SELECT COUNT(*) FROM personas p WHERE p.habitacion_id = h.id AND p.nombre <> ''
                AND COALESCE(p.es_nino, 0) = 0 AND p.nombre NOT LIKE '%(%año)%' AND p.nombre NOT LIKE '%(%años)%') >= 3 THEN 'Triple'
        WHEN (SELECT COUNT(*) FROM personas p WHERE p.habitacion_id = h.id AND p.nombre <> ''
                AND COALESCE(p.es_nino, 0) = 0 AND p.nombre NOT LIKE '%(%año)%' AND p.nombre NOT LIKE '%(%años)%') = 2 THEN 'Doble'
        ELSE 'Single'
      END
      WHERE h.tipo = ''`);
    if (reparadas.affectedRows > 0) console.log(`Habitaciones con tipo vacío reparadas: ${reparadas.affectedRows}`);
  } catch (error) {
    console.error('No se pudo reparar habitaciones.tipo:', error.message);
  }

  // Usuarios: rol, activo, permisos y viajes asignados
  try {
    await pool.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS es_admin TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS permisos TEXT NULL,
        ADD COLUMN IF NOT EXISTS todos_viajes TINYINT(1) NOT NULL DEFAULT 1
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario_viajes (
        usuario_id INT NOT NULL,
        viaje_id INT NOT NULL,
        PRIMARY KEY (usuario_id, viaje_id),
        CONSTRAINT fk_uv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_uv_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
      )
    `);
    // ODISLA es el administrador. Los usuarios que ya existían conservan todos los permisos.
    await pool.query("UPDATE usuarios SET es_admin = 1 WHERE username = 'ODISLA'");
    await pool.query('UPDATE usuarios SET permisos = ? WHERE permisos IS NULL', [JSON.stringify(PERMISOS_TODOS)]);
  } catch (error) {
    console.error('No se pudieron preparar los permisos de usuarios:', error.message);
  }

  // Persona "stack": no paga su parte (los demás de la habitación siguen pagando su cuota normal)
  try {
    await pool.query('ALTER TABLE personas ADD COLUMN IF NOT EXISTS es_stack TINYINT(1) NOT NULL DEFAULT 0');
  } catch (error) {
    console.error('No se pudo agregar personas.es_stack:', error.message);
  }

  // Habitaciones "en revisión": marca para revisar algo pendiente (con motivo, quién y cuándo)
  try {
    await pool.query(`
      ALTER TABLE habitaciones
        ADD COLUMN IF NOT EXISTS en_revision TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS revision_nota VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS revision_por VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS revision_at DATETIME NULL
    `);
  } catch (error) {
    console.error('No se pudieron agregar las columnas de revisión:', error.message);
  }

  // Índices para filtros frecuentes (registro por usuario, pagos por año/mes)
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_usuario ON logs_actividad (usuario)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_anio_mes ON pagos (anio, mes)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_entidad ON logs_actividad (entidad, entidad_id)');
  } catch (error) {
    console.error('No se pudieron crear índices:', error.message);
  }

  // Registro de actividad: descripciones más largas, filtro por acción y soporte de "deshacer"
  try {
    await pool.query(`
      ALTER TABLE logs_actividad
        MODIFY descripcion VARCHAR(500),
        ADD COLUMN IF NOT EXISTS deshacer LONGTEXT NULL,
        ADD COLUMN IF NOT EXISTS deshecho_at DATETIME NULL,
        ADD COLUMN IF NOT EXISTS deshecho_por VARCHAR(50) NULL,
        ADD INDEX IF NOT EXISTS idx_accion (accion)
    `);
  } catch (error) {
    console.error('No se pudo actualizar logs_actividad:', error.message);
  }

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

  // Transferencias al hotel, fecha real de cada pago, comprobantes y saldo del banco (ver migrations/010)
  try {
    await pool.query('ALTER TABLE pagos ADD COLUMN IF NOT EXISTS fecha_recibido DATE NULL');
    // Sin relleno automático: los pagos viejos quedan "sin fecha" hasta que alguien la ponga
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transferencias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        viaje_id INT NOT NULL,
        fecha DATE NOT NULL,
        monto DECIMAL(12,2) NOT NULL,
        corte DATE NULL,
        referencia VARCHAR(100) NULL,
        nota VARCHAR(255) NULL,
        creado_por VARCHAR(50) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_viaje_fecha (viaje_id, fecha),
        CONSTRAINT fk_transferencia_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comprobantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entidad VARCHAR(20) NOT NULL,
        entidad_id INT NOT NULL,
        nombre VARCHAR(200) NOT NULL,
        mime VARCHAR(100) NOT NULL,
        tamano INT NOT NULL,
        datos MEDIUMBLOB NOT NULL,
        subido_por VARCHAR(50) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entidad (entidad, entidad_id)
      )
    `);
    await pool.query(`
      ALTER TABLE viajes
        ADD COLUMN IF NOT EXISTS saldo_banco DECIMAL(12,2) NULL,
        ADD COLUMN IF NOT EXISTS saldo_banco_at DATETIME NULL,
        ADD COLUMN IF NOT EXISTS saldo_banco_por VARCHAR(50) NULL
    `);
  } catch (error) {
    console.error('No se pudieron preparar transferencias/comprobantes:', error.message);
  }

  // Clientes y su enlace con las personas de cada habitación (ver migrations/011)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        telefono VARCHAR(40) NULL,
        whatsapp VARCHAR(40) NULL,
        correo VARCHAR(150) NULL,
        documento VARCHAR(40) NULL,
        fecha_nacimiento DATE NULL,
        ciudad VARCHAR(100) NULL,
        direccion VARCHAR(255) NULL,
        notas TEXT NULL,
        es_fijo TINYINT(1) NOT NULL DEFAULT 0,
        creado_por VARCHAR(50) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        INDEX idx_nombre (nombre),
        INDEX idx_documento (documento)
      )
    `);
    await pool.query('ALTER TABLE personas ADD COLUMN IF NOT EXISTS cliente_id INT NULL');
    await pool.query('ALTER TABLE personas ADD INDEX IF NOT EXISTS idx_cliente (cliente_id)');
    const [fk] = await pool.query(`
      SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'personas' AND CONSTRAINT_NAME = 'fk_persona_cliente'`);
    if (!fk.length) {
      await pool.query(`ALTER TABLE personas ADD CONSTRAINT fk_persona_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL`);
    }
  } catch (error) {
    console.error('No se pudo preparar la tabla de clientes:', error.message);
  }

  for (const usuario of leerUsuariosIniciales()) {
    const passwordHash = await bcrypt.hash(usuario.password, 10);
    await pool.query(
      'INSERT IGNORE INTO usuarios (username, password_hash, nombre_display) VALUES (?, ?, ?)',
      [String(usuario.username).trim().toUpperCase(), passwordHash, usuario.nombreDisplay || usuario.username]
    );
  }
};
