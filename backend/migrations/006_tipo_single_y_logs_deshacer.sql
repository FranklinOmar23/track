-- 1) habitaciones.tipo no aceptaba 'Single' (se guardaba '' sin avisar). Se agrega y se reparan las vacías
--    con la regla de la app: adultos 0-1 → Single, 2 → Doble, 3+ → Triple.
ALTER TABLE habitaciones MODIFY tipo ENUM('Single', 'Doble', 'Triple') NOT NULL DEFAULT 'Doble';
-- (ver db-init.js para el UPDATE de reparación)

-- 2) Registro de actividad: descripciones más largas y soporte de "deshacer"
ALTER TABLE logs_actividad
  MODIFY descripcion VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deshacer LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS deshecho_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS deshecho_por VARCHAR(50) NULL,
  ADD INDEX IF NOT EXISTS idx_accion (accion);
-- (db-init.js aplica todo esto de forma idempotente al iniciar)
