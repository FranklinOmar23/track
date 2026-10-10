import { formatCurrency, clavePeriodo, etiquetaPeriodo } from '../../utils/formatters';
import { calcularTotalPagado, calcularPorcentaje, calcularRankingPersonas } from '../../utils/calculos';

// Estilos compartidos de gráficas
export const DARK_TOOLTIP = {
  backgroundColor: '#1a1f2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

export const heatColor = (pct) => {
  if (pct === 0) return { bg: 'rgba(255,255,255,0.03)', text: '#374151' };
  if (pct < 30)  return { bg: 'rgba(13,148,136,0.15)',  text: '#5eead4' };
  if (pct < 50)  return { bg: 'rgba(13,148,136,0.3)',   text: '#2dd4bf' };
  if (pct < 70)  return { bg: 'rgba(13,148,136,0.5)',   text: '#99f6e4' };
  if (pct < 85)  return { bg: 'rgba(13,148,136,0.7)',   text: '#ccfbf1' };
  return           { bg: 'rgba(16,185,129,0.85)',        text: '#fff' };
};

export const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/** Formateador de moneda para reportes; `short` abrevia miles en los ejes (ej. $12k). */
export const crearFmt = (divisa) => (v, short = false) => {
  if (short && Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return formatCurrency(v, divisa);
};

/** Calcula todos los datos derivados que usan las pestañas de Reportes. */
export const construirDatosReportes = ({ pagosPorMes, porEtiqueta, comparativa, pagosMesViaje, habitaciones, viajeId }) => {
  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalRecaudado = comparativa.reduce((s, v) => s + (v.total_pagado || 0), 0);
  const totalHabs      = comparativa.reduce((s, v) => s + (v.habitaciones || 0), 0);
  const totalPax       = comparativa.reduce((s, v) => s + (v.personas || 0), 0);
  const totalPorCobrar = comparativa.reduce((s, v) => s + (v.total_por_cobrar || 0), 0);
  const tasaCobro      = totalPorCobrar > 0
    ? Number(((totalRecaudado / totalPorCobrar) * 100).toFixed(1)) : 0;

  // ── Tendencias ───────────────────────────────────────────────────────────────
  // Periodos (mes + año) en orden cronológico; el backend ya los agrupa por año
  const periodos = [...pagosPorMes]
    .sort((a, b) => clavePeriodo(a.mes, a.anio) - clavePeriodo(b.mes, b.anio))
    .map((r) => ({ mes: r.mes, anio: r.anio, total: Number(r.total) || 0 }));

  // Cobrado en cada periodo + acumulado (antes "pendiente" era total/12 − pagado, un valor inventado)
  let acumulado = 0;
  const tendenciasData = periodos.map((p) => {
    acumulado += p.total;
    return { mes: etiquetaPeriodo(p.mes, p.anio), pagado: p.total, acumulado };
  });

  // Proyección lineal simple de los próximos 3 meses a partir de la serie real
  const siguientePeriodo = ({ mes, anio }) => {
    const idx = MESES.indexOf(mes);
    return idx === 11 ? { mes: MESES[0], anio: anio + 1 } : { mes: MESES[idx + 1], anio };
  };
  const proyeccionData = periodos.map((p) => ({ mes: etiquetaPeriodo(p.mes, p.anio), actual: p.total, tendencia: null }));
  if (periodos.length > 0) {
    const ultimo = periodos[periodos.length - 1];
    const pendienteSerie = periodos.length > 1 ? (ultimo.total - periodos[0].total) / (periodos.length - 1) : 0;
    proyeccionData[proyeccionData.length - 1].tendencia = ultimo.total; // une la línea real con la proyección
    let p = ultimo;
    for (let k = 1; k <= 3; k += 1) {
      p = siguientePeriodo(p);
      proyeccionData.push({ mes: etiquetaPeriodo(p.mes, p.anio), actual: null, tendencia: Math.max(0, ultimo.total + pendienteSerie * k) });
    }
  }

  // Comparativa de viajes para barchart
  const comparativaData = comparativa.slice(0, 8).map((v) => ({
    name: v.nombre.length > 12 ? v.nombre.slice(0, 12) + '…' : v.nombre,
    fullName: v.nombre,
    pagado: Number(v.total_pagado) || 0,
    pendiente: Number(v.pendiente) || 0,
    porcentaje: Number(v.porcentaje) || 0,
  }));

  // ── Heatmap ──────────────────────────────────────────────────────────────────
  // Mapa de calor: viajes × meses con montos reales cobrados (pagos guardan solo el mes)
  const pagosFiltrados = viajeId
    ? pagosMesViaje.filter((r) => String(r.viaje_id) === String(viajeId))
    : pagosMesViaje;
  const porViaje = new Map();
  const etiquetas = new Map(); // clave de periodo → "Ene 2026"
  pagosFiltrados.forEach((r) => {
    if (!porViaje.has(r.viaje_id)) porViaje.set(r.viaje_id, { nombre: r.viaje_nombre, meses: {}, total: 0 });
    const v = porViaje.get(r.viaje_id);
    const clave = clavePeriodo(r.mes, r.anio);
    v.meses[clave] = (v.meses[clave] || 0) + Number(r.total);
    etiquetas.set(clave, etiquetaPeriodo(r.mes, r.anio));
    v.total += Number(r.total);
  });
  const clavesPeriodo = [...etiquetas.keys()].sort((a, b) => a - b);
  const heatmapMeses = clavesPeriodo.map((c) => etiquetas.get(c));
  const maxCelda = Math.max(1, ...[...porViaje.values()].flatMap((v) => Object.values(v.meses)));
  const heatmapRows = [...porViaje.values()]
    .sort((x, y) => y.total - x.total)
    .slice(0, 10)
    .map((v) => ({
      viaje: v.nombre,
      total: v.total,
      celdas: clavesPeriodo.map((clave) => {
        const total = v.meses[clave] || 0;
        return { mes: etiquetas.get(clave), total, val: Math.round((total / maxCelda) * 100) };
      }),
    }));

  // ── Scatter ──────────────────────────────────────────────────────────────────
  const scatterData = habitaciones.map((h) => ({
    x: h.personas.filter((p) => p.n).length,
    y: calcularTotalPagado(h),
    pct: calcularPorcentaje(h),
    name: `Hab ${h.num}`,
  }));

  // ── Distribución ─────────────────────────────────────────────────────────────
  const byTipo = {};
  habitaciones.forEach((h) => { const t = h.tipo || 'Otro'; byTipo[t] = (byTipo[t] || 0) + 1; });
  const TIPO_COLORS = ['#0d9488', '#8b5cf6', '#f97316', '#3b82f6', '#f43f5e'];
  const tipoData = Object.entries(byTipo).map(([name, value], i) => ({ name, value, color: TIPO_COLORS[i % TIPO_COLORS.length] }));

  let sinPagos = 0, bajo = 0, medio = 0, alto = 0, completado = 0;
  habitaciones.forEach((h) => {
    if (h.stack) { completado++; return; }
    const pct = calcularPorcentaje(h);
    if (pct === 0) sinPagos++;
    else if (pct <= 25) bajo++;
    else if (pct <= 50) medio++;
    else if (pct < 100) alto++;
    else completado++;
  });
  const estadoData = [
    { name: 'Sin pagos',      value: sinPagos,   color: '#f43f5e' },
    { name: 'Bajo (1–25%)',   value: bajo,       color: '#f97316' },
    { name: 'Medio (26–50%)', value: medio,      color: '#8b5cf6' },
    { name: 'Alto (51–99%)',  value: alto,       color: '#3b82f6' },
    { name: 'Completado',     value: completado, color: '#10b981' },
  ].filter((d) => d.value > 0);

  // ── Rendimiento ──────────────────────────────────────────────────────────────
  const rendimientoData = porEtiqueta.map((r) => ({
    name: r.etiqueta.length > 16 ? r.etiqueta.slice(0, 16) + '…' : r.etiqueta,
    fullName: r.etiqueta,
    pagado: Number(r.total_pagado) || 0,
    pendiente: Number(r.pendiente) || 0,
    total: Number(r.total_por_cobrar) || 0,
    habitaciones: r.habitaciones,
    personas: r.personas,
    porcentaje: Number(r.porcentaje) || 0,
  }));

  // ── Rankings ─────────────────────────────────────────────────────────────────
  const rankingViajes = [...comparativa]
    .sort((a, b) => (b.total_pagado || 0) - (a.total_pagado || 0))
    .slice(0, 10)
    .map((v) => ({ label: v.nombre, value: Number(v.total_pagado) || 0, sub: `${Number(v.porcentaje) || 0}% cobrado` }));

  const rankingPersonasBase = calcularRankingPersonas(habitaciones);

  const rankingTopPagadores = [...rankingPersonasBase]
    .filter((p) => p.pagado > 0)
    .sort((a, b) => b.pagado - a.pagado)
    .slice(0, 10)
    .map((p) => ({ label: p.nombre, value: p.pagado, sub: `Hab. ${p.habitaciones.join(', ')}` }));

  const rankingDeudores = [...rankingPersonasBase]
    .filter((p) => p.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente)
    .slice(0, 10)
    .map((p) => ({ label: p.nombre, value: p.pendiente, sub: `Hab. ${p.habitaciones.join(', ')}` }));

  const rankingCentros = [...rendimientoData]
    .sort((a, b) => b.pagado - a.pagado)
    .slice(0, 10)
    .map((r) => ({ label: r.fullName, value: r.pagado, sub: `${r.porcentaje}% cobrado · ${r.habitaciones} hab.` }));

  return {
    totalRecaudado,
    totalHabs,
    totalPax,
    totalPorCobrar,
    tasaCobro,
    tendenciasData,
    proyeccionData,
    comparativaData,
    heatmapMeses,
    heatmapRows,
    scatterData,
    tipoData,
    estadoData,
    rendimientoData,
    rankingViajes,
    rankingTopPagadores,
    rankingDeudores,
    rankingCentros,
  };
};
