-- Edad mínima de pago para niños por viaje
-- 0 = todos los niños pagan (comportamiento anterior)
-- N = niños de N años en adelante pagan; menores de N son gratis
ALTER TABLE viajes
  ADD COLUMN IF NOT EXISTS edad_minima_pago INT NOT NULL DEFAULT 0
  COMMENT '0=todos los ninos pagan; N=ninos de N anos en adelante pagan';
