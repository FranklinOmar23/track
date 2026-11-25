-- Transferencias al hotel, fecha real de cada pago y comprobantes (vouchers).
-- db-init.js lo aplica de forma idempotente al arrancar el servidor.

-- Fecha en que el dinero entró de verdad (opcional; el mes/año del pago sigue diciendo a qué cuota corresponde).
-- Los pagos que ya existían quedan sin fecha (NULL) hasta que alguien la ponga.
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS fecha_recibido DATE NULL;

-- Dinero enviado al hotel / proveedor de cada viaje
CREATE TABLE IF NOT EXISTS transferencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  viaje_id INT NOT NULL,
  fecha DATE NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  corte DATE NULL,                 -- "lo cobrado hasta esta fecha"
  referencia VARCHAR(100) NULL,
  nota VARCHAR(255) NULL,
  creado_por VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_viaje_fecha (viaje_id, fecha),
  CONSTRAINT fk_transferencia_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
);

-- Comprobantes (foto o PDF) de transferencias y de pagos
CREATE TABLE IF NOT EXISTS comprobantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entidad VARCHAR(20) NOT NULL,    -- 'transferencia' | 'pago'
  entidad_id INT NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  tamano INT NOT NULL,
  datos MEDIUMBLOB NOT NULL,
  subido_por VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entidad (entidad, entidad_id)
);

-- Último saldo que mostró el banco (para conciliar con el sistema)
ALTER TABLE viajes
  ADD COLUMN IF NOT EXISTS saldo_banco DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS saldo_banco_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS saldo_banco_por VARCHAR(50) NULL;
