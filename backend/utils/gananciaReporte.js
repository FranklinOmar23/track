// Cálculo de totales y ganancia por viaje, con las mismas reglas que
// frontend/src/utils/calculos.js (cuota de adultos, precio niño, niños gratis por edad).

const EDAD_REGEX = /\((\d+)\s*años?\)/;

const esNino = (p) => !!p.es_nino || EDAD_REGEX.test(p.nombre || '');

const ninoPaga = (p, edadMinimaPago) => {
  if (p.es_gratis) return false;
  const umbral = Number(edadMinimaPago) || 0;
  if (umbral === 0) return true;
  const match = (p.nombre || '').match(EDAD_REGEX);
  if (!match) return true; // sin edad registrada: paga por precaución
  return Number(match[1]) >= umbral;
};

/** Agrupa filas (viaje × habitación × persona) y calcula totales y ganancia por viaje. */
export const calcularGananciasPorViaje = (viajes, filas, pagosPorPersona) => {
  const habsPorViaje = new Map();
  filas.forEach((f) => {
    if (!habsPorViaje.has(f.viaje_id)) habsPorViaje.set(f.viaje_id, new Map());
    const habs = habsPorViaje.get(f.viaje_id);
    if (!habs.has(f.habitacion_id)) {
      habs.set(f.habitacion_id, { total: Number(f.total) || 0, precioNino: Number(f.precio_nino) || 0, personas: [] });
    }
    if (f.persona_id && f.nombre && String(f.nombre).trim()) {
      habs.get(f.habitacion_id).personas.push(f);
    }
  });

  return viajes.map((v) => {
    const habs = [...(habsPorViaje.get(v.id)?.values() || [])];
    let totalPorCobrar = 0;
    let totalPagado = 0;
    let pax = 0;

    habs.forEach((h) => {
      const adultos = h.personas.filter((p) => !esNino(p)).length;
      h.personas.forEach((p) => {
        totalPagado += pagosPorPersona.get(p.persona_id) || 0;
        if (esNino(p)) {
          if (ninoPaga(p, v.edad_minima_pago)) {
            totalPorCobrar += h.precioNino;
            pax += 1;
          }
        } else {
          totalPorCobrar += adultos > 0 ? h.total / adultos : 0;
          pax += 1;
        }
      });
    });

    const tipo = v.ganancia_tipo || 'ninguna';
    const valor = Number(v.ganancia_valor) || 0;
    let estimada = 0;
    let cobrada = 0;
    if (tipo === 'porcentaje') {
      estimada = (totalPorCobrar * valor) / 100;
      cobrada = (totalPagado * valor) / 100;
    } else if (tipo === 'por_persona') {
      estimada = pax * valor;
      cobrada = totalPorCobrar > 0 ? estimada * Math.min(1, totalPagado / totalPorCobrar) : 0;
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
      total_por_cobrar: Math.round(totalPorCobrar * 100) / 100,
      total_pagado: Math.round(totalPagado * 100) / 100,
      pax,
      ganancia_estimada: Math.round(estimada * 100) / 100,
      ganancia_cobrada: Math.round(cobrada * 100) / 100,
      margen: totalPorCobrar > 0 ? Math.round((estimada / totalPorCobrar) * 1000) / 10 : 0,
    };
  });
};
