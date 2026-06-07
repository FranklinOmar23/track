// ── Helpers internos ──────────────────────────────────────────────────────────

/** Extrae la edad numérica del nombre "Juan (3 años)" → 3. Retorna null si no hay. */
const getEdad = (nombre) => {
  const match = (nombre || '').match(/\((\d+)\s*años?\)/);
  return match ? parseInt(match[1], 10) : null;
};

/** Determina si un niño debe pagar según la política de edad del viaje/habitación.
 *  edadMinimaPago = 0 → todos pagan.
 *  edadMinimaPago = N → niños de N años en adelante pagan; menores de N son gratis.
 *  Si el niño no tiene edad registrada → paga (comportamiento conservador).
 */
export const ninoDebePagar = (persona, edadMinimaPago) => {
  const umbral = Number(edadMinimaPago) || 0;
  if (umbral === 0) return true;
  const edad = getEdad(persona.n);
  if (edad === null) return true; // sin edad: paga por precaución
  return edad >= umbral;
};

// ── Funciones públicas ────────────────────────────────────────────────────────

/** Suma todos los pagos registrados de todas las personas de la habitación. */
export const calcularTotalPagado = (habitacion) =>
  habitacion.personas.reduce(
    (sum, persona) =>
      sum + (persona.pagos || []).reduce((t, pago) => t + pago.monto, 0),
    0
  );

/** Cuota que debe pagar una persona específica.
 *  - Adulto: total / cantidad de adultos
 *  - Niño que paga: precioNino de la habitación
 *  - Niño gratis (por edadMinimaPago): 0
 */
export const calcularCuotaPersona = (habitacion, persona) => {
  const esNino = persona.esNino || /\(\d+ años?\)/.test(persona.n || '');

  if (esNino) {
    if (persona.esGratis || !ninoDebePagar(persona, habitacion.edadMinimaPago)) return 0;
    return Number(habitacion.precioNino) || 0;
  }

  const cantidadAdultos = habitacion.personas.filter(
    (p) => p.n && !p.esNino && !/\(\d+ años?\)/.test(p.n)
  ).length;

  return cantidadAdultos > 0 ? habitacion.total / cantidadAdultos : 0;
};

/** Pendiente de una persona = cuota − pagado (mínimo 0). */
export const calcularPendientePersona = (habitacion, persona) => {
  const cuota = calcularCuotaPersona(habitacion, persona);
  const pagado = (persona.pagos || []).reduce((s, p) => s + p.monto, 0);
  return Math.max(0, cuota - pagado);
};

/** Porcentaje de pago de la habitación (0–100).
 *  Usa calcularCuotaPersona para el total real, respetando niños gratis.
 */
export const calcularPorcentaje = (habitacion) => {
  const totalPagado = calcularTotalPagado(habitacion);
  const totalReal = habitacion.personas
    .filter((p) => p.n)
    .reduce((sum, p) => sum + calcularCuotaPersona(habitacion, p), 0);
  return totalReal > 0 ? Math.min(100, Math.round((totalPagado / totalReal) * 100)) : 0;
};

/** Estadísticas agregadas de un array de habitaciones. */
export const calcularEstadisticas = (habitaciones) => {
  const total = habitaciones.reduce((sum, hab) => {
    return sum + hab.personas
      .filter((p) => p.n)
      .reduce((s, p) => s + calcularCuotaPersona(hab, p), 0);
  }, 0);

  const pagado = habitaciones.reduce((sum, hab) => sum + calcularTotalPagado(hab), 0);
  const pendiente = Math.max(0, total - pagado);

  return { total, pagado, pendiente };
};

/** Filtra habitaciones por búsqueda de texto y estado de pago. */
export const filtrarHabitaciones = (habitaciones, { busqueda, estado }) =>
  habitaciones.filter((hab) => {
    const texto = `${hab.num} ${hab.tipo} ${hab.personas.map((p) => p.n).join(' ')}`.toLowerCase();
    if (busqueda && !texto.includes(busqueda.toLowerCase())) return false;

    const pagado   = calcularTotalPagado(hab);
    const totalReal = hab.personas.filter((p) => p.n)
      .reduce((s, p) => s + calcularCuotaPersona(hab, p), 0);
    const completa  = hab.stack || pagado >= totalReal;
    const pendiente = Math.max(0, totalReal - pagado);

    if (estado === 'pendiente' && pendiente <= 0) return false;
    if (estado === 'completo'  && !completa)       return false;

    return true;
  });
