export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const LOCALE_MAP = {
  USD: 'en-US',
  DOP: 'es-DO',
  EUR: 'de-DE',
  MXN: 'es-MX',
  COP: 'es-CO',
};

/** Divisa más usada entre los viajes (para totales que agregan varios viajes). */
export const divisaPrincipal = (viajes = []) => {
  const conteo = {};
  viajes.forEach((v) => { const d = v.divisa || 'USD'; conteo[d] = (conteo[d] || 0) + 1; });
  return Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0] || 'USD';
};

export const formatCurrency = (valor, divisa = 'USD') => {
  const locale = LOCALE_MAP[divisa] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: divisa || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor || 0);
};
