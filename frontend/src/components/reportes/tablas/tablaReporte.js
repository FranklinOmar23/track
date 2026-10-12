// Lógica de las tablas de reportes (formato de celdas, grupos, subtotales y totales)
import { formatCurrency } from '../../../utils/formatters';

const fmtFecha = (v) => (v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtFechaHora = (v) => (v ? new Date(v).toLocaleString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/** Formatea una celda según el tipo de columna. */
export const formatearCelda = (col, valor, divisa) => {
  if (valor === null || valor === undefined || valor === '') return col.tipo === 'firma' ? '' : '—';
  switch (col.tipo) {
    case 'monto': return formatCurrency(valor, divisa);
    case 'porcentaje': return `${(Number(valor) * 100).toFixed(1)}%`;
    case 'numero': return Number(valor).toLocaleString('es-DO');
    case 'fecha': return fmtFecha(valor);
    case 'fechaHora': return fmtFechaHora(valor);
    default: return String(valor);
  }
};

export const esNumerica = (col) => ['monto', 'numero', 'porcentaje'].includes(col.tipo);

/** Suma las columnas con total; si hay montos en varias divisas, ese total no se puede sumar. */
const calcularTotales = (columnas, filas) => {
  const divisas = new Set(filas.map((f) => f.divisa).filter(Boolean));
  return columnas.map((c) => {
    if (c.total === 'conteo') return filas.length;
    if (c.total !== 'suma') return null;
    if (c.tipo === 'monto' && divisas.size > 1) return 'varias';
    return filas.reduce((s, f) => s + (Number(f[c.clave]) || 0), 0);
  });
};

/**
 * Construye la lista de filas a mostrar/exportar: grupos con subtotal (si hay agruparPor) y total general.
 * Devuelve [{ tipoFila, valores, divisa, clave }].
 */
export const armarFilas = ({ columnas, filas, agruparPor, orden }) => {
  const ordenar = (lista) => {
    if (!orden.clave) return lista;
    const col = columnas.find((c) => c.clave === orden.clave);
    return [...lista].sort((a, b) => {
      const va = a[orden.clave]; const vb = b[orden.clave];
      const cmp = esNumerica(col) ? (Number(va) || 0) - (Number(vb) || 0)
        : String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true });
      return orden.dir === 'asc' ? cmp : -cmp;
    });
  };
  const fila = (f, i) => ({ tipoFila: 'dato', clave: `d${i}`, divisa: f.divisa, valores: columnas.map((c) => f[c.clave]) });
  const resultado = [];

  if (agruparPor) {
    const grupos = new Map();
    filas.forEach((f) => {
      const k = f[agruparPor] ?? '—';
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(f);
    });
    let i = 0;
    grupos.forEach((lista, nombre) => {
      resultado.push({ tipoFila: 'grupo', clave: `g${nombre}`, valores: [`${nombre} (${lista.length})`] });
      ordenar(lista).forEach((f) => { resultado.push(fila(f, i)); i += 1; });
      if (grupos.size > 1 && columnas.some((c) => c.total)) {
        const tot = calcularTotales(columnas, lista);
        resultado.push({ tipoFila: 'subtotal', clave: `s${nombre}`, divisa: lista[0]?.divisa, valores: columnas.map((c, ci) => (ci === 0 ? `Subtotal ${nombre}` : tot[ci])) });
      }
    });
  } else {
    ordenar(filas).forEach((f, i) => resultado.push(fila(f, i)));
  }

  if (columnas.some((c) => c.total) && filas.length) {
    const tot = calcularTotales(columnas, filas);
    resultado.push({ tipoFila: 'total', clave: 'total', divisa: filas[0]?.divisa, valores: columnas.map((c, ci) => (ci === 0 ? 'Total general' : tot[ci])) });
  }
  return resultado;
};
