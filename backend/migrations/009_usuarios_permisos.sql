-- Usuarios con rol, permisos y viajes asignados (db-init.js lo aplica de forma idempotente)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS es_admin TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS permisos TEXT NULL,
  ADD COLUMN IF NOT EXISTS todos_viajes TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS usuario_viajes (
  usuario_id INT NOT NULL,
  viaje_id INT NOT NULL,
  PRIMARY KEY (usuario_id, viaje_id),
  CONSTRAINT fk_uv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_uv_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
);

UPDATE usuarios SET es_admin = 1 WHERE username = 'ODISLA';
UPDATE usuarios SET permisos = '{"editar":true,"pagos":true,"crear_viajes":true,"reportes":true,"actividad":true}' WHERE permisos IS NULL;
