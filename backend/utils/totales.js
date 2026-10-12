// Totales de habitaciones y viajes con las mismas reglas que frontend/src/utils/calculos.js:
// - Adulto: total de la habitación / cantidad de adultos
// - Niño: precio niño, salvo que esté marcado gratis o sea menor que la edad mínima de pago
// Todo cálculo de "por cobrar" del backend debe pasar por aquí para no desalinearse del frontend.

const EDAD_REGEX = /\((\d+)\s*años?\)/;

export const esNino = (persona) => !!persona.esNino || EDAD_REGEX.test(persona.nombre || '');

export const ninoPaga = (persona, edadMinimaPago) => {
  if (persona.esGratis) return false;
  const umbral = Number(edadMinimaPago) || 0;
  if (umbral === 0) return true;
  const match = (persona.nombre || '').match(EDAD_REGEX);
  if (!match) return true; // sin edad registrada: paga por precaución
  return Number(match[1]) >= umbral;
};

/** Personas con nombre de la habitación, cada una con su `cuota` y si `paga`. */
export const cuotasHabitacion = (habitacion, edadMinimaPago) => {
  const personas = habitacion.personas.filter((p) => p.nombre && String(p.nombre).trim());
  // El total se reparte solo entre los adultos que pagan (los stack no pagan)
  const adultos = personas.filter((p) => !esNino(p) && !p.esStack).length;
  return personas.map((p) => {
    // Habitación stack: nadie paga. Persona stack: no paga y su parte la cubren los demás adultos.
    if (habitacion.stack || p.esStack) return { ...p, paga: false, cuota: 0 };
    if (esNino(p)) {
      const paga = ninoPaga(p, edadMinimaPago);
      return { ...p, paga, cuota: paga ? Number(habitacion.precioNino) || 0 : 0 };
    }
    return { ...p, paga: true, cuota: adultos > 0 ? (Number(habitacion.total) || 0) / adultos : 0 };
  });
};

/** Totales de una habitación: por cobrar, pagado, personas que pagan y personas con nombre. */
export const resumenHabitacion = (habitacion, edadMinimaPago) => {
  const cuotas = cuotasHabitacion(habitacion, edadMinimaPago);
  return {
    totalPorCobrar: cuotas.reduce((s, p) => s + p.cuota, 0),
    pagado: habitacion.personas.reduce((s, p) => s + (Number(p.pagado) || 0), 0),
    pax: cuotas.filter((p) => p.paga).length,
    personas: cuotas.length,
  };
};

/** Suma resúmenes de varias habitaciones. */
export const sumarResumenes = (habitaciones, edadMinimaPago) =>
  habitaciones.reduce((acc, h) => {
    const r = resumenHabitacion(h, edadMinimaPago);
    acc.totalPorCobrar += r.totalPorCobrar;
    acc.pagado += r.pagado;
    acc.pax += r.pax;
    acc.personas += r.personas;
    acc.habitaciones += 1;
    return acc;
  }, { totalPorCobrar: 0, pagado: 0, pax: 0, personas: 0, habitaciones: 0 });

const redondear = (n) => Math.round(n * 100) / 100;
export { redondear };

/**
 * Carga habitaciones con sus personas y lo pagado por cada una, agrupadas por viaje.
 * Devuelve Map<viajeId, habitacion[]>, donde habitacion = { id, etiqueta, total, precioNino, personas[] }.
 */
export const cargarHabitacionesPorViaje = async (pool, viajeId = null) => {
  const where = viajeId ? 'WHERE h.viaje_id = ?' : 'WHERE h.viaje_id IS NOT NULL';
  const params = viajeId ? [Number(viajeId)] : [];

  const [filas] = await pool.query(`
    SELECT h.viaje_id, h.id AS habitacion_id, h.etiqueta, h.total, h.precio_nino, h.es_stack AS hab_stack,
           p.id AS persona_id, p.nombre, p.es_nino, COALESCE(p.es_gratis, 0) AS es_gratis, COALESCE(p.es_stack, 0) AS es_stack,
           COALESCE(pg.pagado, 0) AS pagado
    FROM habitaciones h
    LEFT JOIN personas p ON p.habitacion_id = h.id
    LEFT JOIN (SELECT persona_id, SUM(monto) AS pagado FROM pagos GROUP BY persona_id) pg ON pg.persona_id = p.id
    ${where}
  `, params);

  const porViaje = new Map();
  const porHabitacion = new Map();
  filas.forEach((f) => {
    if (!porHabitacion.has(f.habitacion_id)) {
      const hab = {
        id: f.habitacion_id,
        etiqueta: f.etiqueta || '',
        total: Number(f.total) || 0,
        precioNino: Number(f.precio_nino) || 0,
        stack: !!f.hab_stack,
        personas: [],
      };
      porHabitacion.set(f.habitacion_id, hab);
      if (!porViaje.has(f.viaje_id)) porViaje.set(f.viaje_id, []);
      porViaje.get(f.viaje_id).push(hab);
    }
    if (f.persona_id) {
      porHabitacion.get(f.habitacion_id).personas.push({
        id: f.persona_id,
        nombre: f.nombre,
        esNino: !!f.es_nino,
        esGratis: !!f.es_gratis,
        esStack: !!f.es_stack,
        pagado: Number(f.pagado) || 0,
      });
    }
  });
  return porViaje;
};
