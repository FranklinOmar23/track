import { sumarResumenes, redondear } from './totales.js';

/** Totales y ganancia por viaje. `habsPorViaje` viene de cargarHabitacionesPorViaje(). */
export const calcularGananciasPorViaje = (viajes, habsPorViaje) =>
  viajes.map((v) => {
    const { totalPorCobrar, pagado, pax } = sumarResumenes(habsPorViaje.get(v.id) || [], v.edad_minima_pago);

    const tipo = v.ganancia_tipo || 'ninguna';
    const valor = Number(v.ganancia_valor) || 0;
    let estimada = 0;
    let cobrada = 0;
    if (tipo === 'porcentaje') {
      estimada = (totalPorCobrar * valor) / 100;
      cobrada = (pagado * valor) / 100;
    } else if (tipo === 'por_persona') {
      estimada = pax * valor;
      cobrada = totalPorCobrar > 0 ? estimada * Math.min(1, pagado / totalPorCobrar) : 0;
    }

    return {
      id: v.id,
      nombre: v.nombre,
      tipo: v.tipo || 'resort',
      divisa: v.divisa || 'USD',
      estado: v.estado || 'activo',
      fecha_inicio: v.fecha_inicio,
      fecha_fin: v.fecha_fin,
      ganancia_tipo: tipo,
      ganancia_valor: valor,
      total_por_cobrar: redondear(totalPorCobrar),
      total_pagado: redondear(pagado),
      pax,
      ganancia_estimada: redondear(estimada),
      ganancia_cobrada: redondear(cobrada),
      margen: totalPorCobrar > 0 ? Math.round((estimada / totalPorCobrar) * 1000) / 10 : 0,
    };
  });
