// Calcula el total pagado de una habitación (todos los pagos de todas las personas)
export const calcularTotalPagado = (habitacion) => {
  return habitacion.personas.reduce((sum, persona) => {
    return sum + (persona.pagos || []).reduce((total, pago) => total + pago.monto, 0);
  }, 0);
};

// Calcula cuánto debe pagar una persona específica según si es niño o adulto
export const calcularCuotaPersona = (habitacion, persona) => {
  if (persona.esNino) {
    // Los niños pagan precioNino (puede ser 0 si aún no se definió)
    return Number(habitacion.precioNino) || 0;
  }

  // Adultos: total de la habitación dividido entre cantidad de adultos
  const cantidadAdultos = habitacion.personas.filter(
    (p) => p.n && !p.esNino && !/\(\d+ años\)/.test(p.n)
  ).length;

  return cantidadAdultos > 0 ? (habitacion.total / cantidadAdultos) : 0;
};

// Calcula el pendiente de una persona específica
export const calcularPendientePersona = (habitacion, persona) => {
  const cuota = calcularCuotaPersona(habitacion, persona);
  const pagado = (persona.pagos || []).reduce((s, p) => s + p.monto, 0);
  return Math.max(0, cuota - pagado);
};

export const calcularPorcentaje = (habitacion) => {
  const totalPagado = calcularTotalPagado(habitacion);
  // Total real = total adultos + (precioNino × cantidad niños)
  const cantidadNinos = habitacion.personas.filter(
    (p) => p.esNino || /\(\d+ años\)/.test(p.n)
  ).length;
  const totalReal = habitacion.total + (Number(habitacion.precioNino) || 0) * cantidadNinos;
  return totalReal ? Math.min(100, Math.round((totalPagado / totalReal) * 100)) : 0;
};

export const calcularEstadisticas = (habitaciones) => {
  const total = habitaciones.reduce((sum, hab) => {
    const cantidadNinos = hab.personas.filter(
      (p) => p.esNino || /\(\d+ años\)/.test(p.n)
    ).length;
    return sum + hab.total + (Number(hab.precioNino) || 0) * cantidadNinos;
  }, 0);

  const pagado = habitaciones.reduce((sum, hab) => sum + calcularTotalPagado(hab), 0);

  const pendiente = habitaciones.reduce((sum, hab) => {
    const cantidadNinos = hab.personas.filter(
      (p) => p.esNino || /\(\d+ años\)/.test(p.n)
    ).length;
    const totalReal = hab.total + (Number(hab.precioNino) || 0) * cantidadNinos;
    return sum + Math.max(0, totalReal - calcularTotalPagado(hab));
  }, 0);

  return { total, pagado, pendiente };
};

export const filtrarHabitaciones = (habitaciones, { busqueda, estado }) => {
  return habitaciones.filter((hab) => {
    const texto = `${hab.num} ${hab.tipo} ${hab.personas.map((p) => p.n).join(' ')}`.toLowerCase();
    if (busqueda && !texto.includes(busqueda.toLowerCase())) return false;

    const pagado    = calcularTotalPagado(hab);
    const cantNinos = hab.personas.filter((p) => p.esNino || /\(\d+ años\)/.test(p.n)).length;
    const totalReal = hab.total + (Number(hab.precioNino) || 0) * cantNinos;
    const completa  = hab.stack || pagado >= totalReal;
    const pendiente = Math.max(0, totalReal - pagado);

    if (estado === 'pendiente' && pendiente <= 0) return false;
    if (estado === 'completo' && !completa) return false;

    return true;
  });
};