import { formatCurrency } from '../../utils/formatters';

/** Montos por divisa en una línea: "RD$12,000 · US$300" (un cliente puede tener viajes en varias divisas). */
export const montosPorDivisa = (totales = [], campo = 'pagado') => {
  const conValor = totales.filter((t) => t[campo] > 0.009);
  if (!conValor.length) return formatCurrency(0, totales[0]?.divisa || 'DOP');
  return conValor.map((t) => formatCurrency(t[campo], t.divisa)).join(' · ');
};

export const soloDigitos = (tel) => String(tel || '').replace(/\D/g, '');

/** Enlace de WhatsApp. Los números dominicanos de 10 dígitos (809/829/849) llevan el 1 delante. */
export const enlaceWhatsapp = (tel) => {
  let n = soloDigitos(tel);
  if (n.length === 10) n = `1${n}`;
  return n ? `https://wa.me/${n}` : null;
};

export const iniciales = (nombre = '') => nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

/** "7 nov 2026" desde 'AAAA-MM-DD'. */
export const fechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
};

/** Edad cumplida a partir de la fecha de nacimiento. */
export const edad = (iso) => {
  if (!iso) return null;
  const n = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e -= 1;
  return e >= 0 ? e : null;
};

/** "Hace 3 meses", "Hace 2 años"… para el último viaje. */
export const haceCuanto = (iso) => {
  if (!iso) return '';
  const dias = Math.floor((Date.now() - new Date(`${String(iso).slice(0, 10)}T00:00:00`).getTime()) / 86400000);
  if (dias < 0) return 'Próximo';
  if (dias < 1) return 'Hoy';
  if (dias < 31) return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
  const meses = Math.floor(dias / 30.4);
  if (meses < 12) return `Hace ${meses} mes${meses !== 1 ? 'es' : ''}`;
  const anios = Math.floor(meses / 12);
  return `Hace ${anios} año${anios !== 1 ? 's' : ''}`;
};
