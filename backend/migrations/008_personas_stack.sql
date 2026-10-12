-- Persona "stack": no paga su parte; el resto de la habitación sigue pagando su cuota normal
-- (db-init.js lo aplica de forma idempotente al iniciar)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS es_stack TINYINT(1) NOT NULL DEFAULT 0;
