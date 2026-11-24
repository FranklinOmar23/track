// Fechas de los viajes: cuánto falta, si ya pasó y cómo mostrarlas.
const UN_DIA = 24 * 60 * 60 * 1000;

export const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const aFecha = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00`) : null);

const MES = (d) => d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', '');

/** Situación del viaje según sus fechas: 'proximo' | 'en_curso' | 'terminado' | null (sin fechas). */
export const situacionViaje = (viaje) => {
  const inicio = aFecha(viaje.fechaInicio);
  const fin = aFecha(viaje.fechaFin) || inicio;
  if (!inicio) return { situacion: null, dias: null, inicio: null, fin: null };
  const h = hoy();
  if (fin < h) return { situacion: 'terminado', dias: Math.round((h - fin) / UN_DIA), inicio, fin };
  if (inicio <= h) return { situacion: 'en_curso', dias: Math.round((fin - h) / UN_DIA), inicio, fin };
  return { situacion: 'proximo', dias: Math.round((inicio - h) / UN_DIA), inicio, fin };
};

/** "En 10 días", "Mañana", "Hoy", "En curso", "Por cerrar"… (para insignias). */
export const textoSituacion = ({ situacion, dias }) => {
  if (situacion === 'terminado') return 'Por cerrar';
  if (situacion === 'en_curso') return 'En curso';
  if (situacion === 'proximo') return dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`;
  return null;
};

/** "Sale en 10 días", "Sale mañana", "En curso · termina en 2 días", "Terminó hace 15 días". */
export const textoCuenta = ({ situacion, dias }) => {
  if (situacion === 'proximo') return dias === 0 ? 'Sale hoy' : dias === 1 ? 'Sale mañana' : `Sale en ${dias} días`;
  if (situacion === 'en_curso') return dias === 0 ? 'En curso · termina hoy' : `En curso · termina en ${dias} día${dias !== 1 ? 's' : ''}`;
  if (situacion === 'terminado') return dias === 0 ? 'Terminó hoy' : `Terminó hace ${dias} día${dias !== 1 ? 's' : ''}`;
  return null;
};

/** "07 nov → 09 nov 2026" (o una sola fecha, o null). */
export const rangoLargo = (viaje) => {
  const i = aFecha(viaje.fechaInicio);
  const f = aFecha(viaje.fechaFin);
  const corta = (d) => `${String(d.getDate()).padStart(2, '0')} ${MES(d)}`;
  if (i && f && +i !== +f) return `${corta(i)} → ${corta(f)} ${f.getFullYear()}`;
  const una = i || f;
  return una ? `${corta(una)} ${una.getFullYear()}` : null;
};

/** "04 → 06 dic 2026" cuando es el mismo mes; si no, igual que rangoLargo. */
export const rangoCompacto = (viaje) => {
  const i = aFecha(viaje.fechaInicio);
  const f = aFecha(viaje.fechaFin);
  if (i && f && i.getMonth() === f.getMonth() && i.getFullYear() === f.getFullYear() && +i !== +f) {
    return `${String(i.getDate()).padStart(2, '0')} → ${String(f.getDate()).padStart(2, '0')} ${MES(f)} ${f.getFullYear()}`;
  }
  return rangoLargo(viaje);
};

/** "4–6 dic" (para listas compactas). */
export const rangoDias = (viaje) => {
  const i = aFecha(viaje.fechaInicio);
  const f = aFecha(viaje.fechaFin);
  if (!i) return '';
  if (!f || +i === +f) return `${i.getDate()} ${MES(i)}`;
  if (i.getMonth() === f.getMonth()) return `${i.getDate()}–${f.getDate()} ${MES(f)}`;
  return `${i.getDate()} ${MES(i)} – ${f.getDate()} ${MES(f)}`;
};

/** "7 nov 2026" */
export const fechaMedia = (d) => (d ? `${d.getDate()} ${MES(d)} ${d.getFullYear()}` : '');

export const mesCorto = (d) => MES(d).toUpperCase();

/** Color de la barra de avance de cobro de un viaje. */
export const colorAvanceViaje = (pct) => (pct >= 50 ? '#059669' : pct >= 20 ? '#d97706' : '#dc2626');
/** Color de la barra de avance de una habitación. */
export const colorAvanceHabitacion = (pct) => (pct >= 80 ? '#059669' : pct >= 30 ? '#d97706' : '#dc2626');
