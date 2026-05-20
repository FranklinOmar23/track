export const calcularTotalPagado = (habitacion) => {
  return habitacion.personas.reduce((sum, persona) => {
    return sum + persona.pagos.reduce((total, pago) => total + pago.monto, 0);
  }, 0);
};

export const calcularPorcentaje = (habitacion) => {
  const totalPagado = calcularTotalPagado(habitacion);
  return habitacion.total ? Math.min(100, Math.round(totalPagado / habitacion.total * 100)) : 0;
};

export const calcularEstadisticas = (habitaciones) => {
  const total = habitaciones.reduce((sum, hab) => sum + hab.total, 0);
  const pagado = habitaciones.reduce((sum, hab) => sum + calcularTotalPagado(hab), 0);
  const pendiente = habitaciones.reduce((sum, hab) => {
    return sum + Math.max(0, hab.total - calcularTotalPagado(hab));
  }, 0);
  
  return { total, pagado, pendiente };
};

export const filtrarHabitaciones = (habitaciones, { busqueda, estado }) => {
  return habitaciones.filter(hab => {
    const texto = `${hab.num} ${hab.tipo} ${hab.personas.map(p => p.n).join(' ')}`.toLowerCase();
    if (busqueda && !texto.includes(busqueda.toLowerCase())) return false;
    
    const porcentaje = calcularPorcentaje(hab);
    const pendienteHab = Math.max(0, hab.total - calcularTotalPagado(hab));
    const completaHab = hab.stack || calcularTotalPagado(hab) >= hab.total;
    
    if (estado === 'pendiente' && pendienteHab <= 0) return false;
    if (estado === 'completo' && !completaHab) return false;
    
    return true;
  });
};