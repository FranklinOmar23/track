export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Valida y normaliza un pago. Devuelve { error } o { mes, monto, anio }. */
export const normalizarPago = ({ mes, monto, anio }) => {
  if (!MESES.includes(mes)) {
    return { error: 'Mes inválido.' };
  }
  const montoNum = Number(monto);
  if (typeof monto !== 'number' || !Number.isFinite(montoNum) || montoNum <= 0) {
    return { error: 'El monto debe ser un número mayor que 0.' };
  }
  const anioNum = anio === undefined || anio === null || anio === ''
    ? new Date().getFullYear()
    : Number(anio);
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
    return { error: 'Año inválido.' };
  }
  return { mes, monto: Math.round(montoNum * 100) / 100, anio: anioNum };
};
