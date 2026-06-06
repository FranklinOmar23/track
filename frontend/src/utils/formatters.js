export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const LOCALE_MAP = {
  USD: 'en-US',
  DOP: 'es-DO',
  EUR: 'de-DE',
  MXN: 'es-MX',
  COP: 'es-CO',
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
