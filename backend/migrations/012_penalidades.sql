-- Penalidades del hotel (p. ej. cuando alguien se sale del viaje después de cierta fecha).
-- Van "por fuera": no suman al total por cobrar, a lo pagado ni a lo pendiente del viaje.
-- db-init.js lo aplica de forma idempotente al arrancar el servidor.
CREATE TABLE IF NOT EXISTS penalidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  viaje_id INT NOT NULL,
  persona_nombre VARCHAR(150) NOT NULL,   -- texto: la persona puede ya no estar en el viaje
  habitacion VARCHAR(30) NULL,
  fecha DATE NOT NULL,                     -- cuándo se salió / se aplicó la penalidad
  monto DECIMAL(12,2) NOT NULL,            -- lo que cobra el hotel
  cobrado DECIMAL(12,2) NOT NULL DEFAULT 0, -- lo que ya pagó el cliente de esa penalidad
  pagada_hotel TINYINT(1) NOT NULL DEFAULT 0,
  nota VARCHAR(255) NULL,
  creado_por VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_viaje_fecha (viaje_id, fecha),
  CONSTRAINT fk_penalidad_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
);

-- Persona asociada (sin FK a propósito: si se elimina a la persona, la penalidad la sigue recordando) y motivo
ALTER TABLE penalidades
  ADD COLUMN IF NOT EXISTS persona_id INT NULL,
  ADD COLUMN IF NOT EXISTS motivo VARCHAR(40) NOT NULL DEFAULT 'salida';
