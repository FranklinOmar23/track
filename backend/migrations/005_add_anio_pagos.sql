-- Año del pago (antes solo se guardaba el mes, y los reportes mezclaban años)
-- (db-init.js también aplica esto de forma idempotente al iniciar)
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS anio SMALLINT NULL;
UPDATE pagos SET anio = YEAR(COALESCE(created_at, NOW())) WHERE anio IS NULL;
