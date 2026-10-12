-- Habitaciones "en revisión" (db-init.js lo aplica de forma idempotente al iniciar)
ALTER TABLE habitaciones
  ADD COLUMN IF NOT EXISTS en_revision TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_nota VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS revision_por VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS revision_at DATETIME NULL;
