export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Fecha de hoy como 'YYYY-MM-DD' (hora local del servidor). */
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Valida una fecha 'YYYY-MM-DD'. Devuelve la fecha, null si viene vacía, o false si es inválida. */
export const normalizarFecha = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const texto = String(valor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== texto) return false;
  const anio = d.getUTCFullYear();
  return anio >= 2000 && anio <= 2100 ? texto : false;
};

/** Valida y normaliza un pago. Devuelve { error } o { mes, monto, anio, fechaRecibido }. */
export const normalizarPago = ({ mes, monto, anio, fechaRecibido }) => {
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
  const fecha = normalizarFecha(fechaRecibido);
  if (fecha === false) {
    return { error: 'Fecha de recibido inválida.' };
  }
  // Opcional: muchos pagos viejos no tienen el día en que llegó el dinero
  return { mes, monto: Math.round(montoNum * 100) / 100, anio: anioNum, fechaRecibido: fecha };
};
