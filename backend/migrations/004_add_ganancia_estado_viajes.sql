-- Ganancia por viaje y estado abierto/cerrado
-- ganancia_tipo: 'ninguna' | 'porcentaje' (% del total) | 'por_persona' (monto fijo por persona que paga)
-- (db-init.js también aplica esto de forma idempotente al iniciar)
ALTER TABLE viajes
  ADD COLUMN IF NOT EXISTS ganancia_tipo VARCHAR(20) NOT NULL DEFAULT 'ninguna',
  ADD COLUMN IF NOT EXISTS ganancia_valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS cerrado_at DATETIME NULL;
