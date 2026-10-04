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

/** Ranking de personas por lo pagado y lo pendiente, agregando por nombre
 *  a través de todas las habitaciones en las que aparecen. */
export const calcularRankingPersonas = (habitaciones) => {
  const map = new Map();
  habitaciones.forEach((hab) => {
    hab.personas.forEach((persona) => {
      if (!persona.n) return;
      const nombre = persona.n.trim();
      const pagado = (persona.pagos || []).reduce((s, p) => s + p.monto, 0);
      const pendiente = calcularPendientePersona(hab, persona);
      if (!map.has(nombre)) {
        map.set(nombre, { nombre, pagado: 0, pendiente: 0, habitaciones: new Set() });
      }
      const entry = map.get(nombre);
      entry.pagado += pagado;
      entry.pendiente += pendiente;
      entry.habitaciones.add(hab.num);
    });
  });
  return [...map.values()].map((e) => ({ ...e, habitaciones: [...e.habitaciones] }));
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

/** Personas que cuentan para la ganancia por persona: con nombre y que no entran gratis. */
const personaCuentaParaGanancia = (habitacion, persona) => {
  if (!persona.n) return false;
  const esNino = persona.esNino || /\(\d+ años?\)/.test(persona.n);
  if (!esNino) return true;
  return !persona.esGratis && ninoDebePagar(persona, habitacion.edadMinimaPago);
};

/** Ganancia del viaje según su configuración.
 *  - porcentaje: % sobre el total por cobrar (estimada) y sobre lo pagado (cobrada)
 *  - por_persona: monto fijo × personas que pagan; se considera cobrada en proporción a lo pagado
 */
export const calcularGanancia = (viaje, habitaciones) => {
  const tipo  = viaje?.gananciaTipo || 'ninguna';
  const valor = Number(viaje?.gananciaValor) || 0;
  const { total, pagado } = calcularEstadisticas(habitaciones);
  const pax = habitaciones.reduce(
    (sum, hab) => sum + hab.personas.filter((p) => personaCuentaParaGanancia(hab, p)).length,
    0
  );

  if (tipo === 'porcentaje') {
    return { tipo, valor, pax, estimada: (total * valor) / 100, cobrada: (pagado * valor) / 100 };
  }
  if (tipo === 'por_persona') {
    const estimada = pax * valor;
    const cobrada  = total > 0 ? estimada * Math.min(1, pagado / total) : 0;
    return { tipo, valor, pax, estimada, cobrada };
  }
  return { tipo: 'ninguna', valor: 0, pax, estimada: 0, cobrada: 0 };
};

/** Ganancia estimada a partir de los totales del dashboard (sin habitaciones cargadas). */
export const calcularGananciaResumen = ({ ganancia_tipo, ganancia_valor, total_por_cobrar, personas_pagan }) => {
  const valor = Number(ganancia_valor) || 0;
  if (ganancia_tipo === 'porcentaje') return ((Number(total_por_cobrar) || 0) * valor) / 100;
  if (ganancia_tipo === 'por_persona') return (Number(personas_pagan) || 0) * valor;
  return 0;
};
