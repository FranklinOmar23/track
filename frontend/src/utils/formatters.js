export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const formatCurrency = (valor) => {
  return '$' + Math.round(valor).toLocaleString('es-DO');
};