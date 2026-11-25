-- Clientes: ficha de cada persona que viaja con nosotros (datos de contacto y notas).
-- Cada persona de una habitación puede enlazarse a un cliente con personas.cliente_id.
-- Los viajes, pagos y deudas del cliente se calculan siempre desde sus personas enlazadas.
-- (db-init.js aplica lo mismo al arrancar; este archivo queda como documentación)

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
);

ALTER TABLE personas ADD COLUMN IF NOT EXISTS cliente_id INT NULL;
ALTER TABLE personas ADD INDEX IF NOT EXISTS idx_cliente (cliente_id);
-- Llave para que, al borrar un cliente, sus personas sigan en los viajes y solo pierdan el enlace.
-- db-init.js la crea al arrancar el backend solo si no existe, así que este archivo se puede
-- ejecutar varias veces sin error. Solo si la consulta de abajo no devuelve nada, ejecuta a mano
-- la línea comentada del final.
SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_persona_cliente';
-- ALTER TABLE personas ADD CONSTRAINT fk_persona_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
