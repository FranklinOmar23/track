-- Migration: Create viajes table and link habitaciones to voyages

CREATE TABLE IF NOT EXISTS viajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  nota TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE habitaciones
  ADD COLUMN viaje_id INT NULL;

ALTER TABLE habitaciones
  ADD CONSTRAINT fk_habitaciones_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE SET NULL;

-- Optional: create a default viaje for existing habitaciones data
-- INSERT INTO viajes (nombre, nota) VALUES ('Viaje actual', 'Migración de viaje existente');
-- UPDATE habitaciones SET viaje_id = LAST_INSERT_ID() WHERE viaje_id IS NULL;
