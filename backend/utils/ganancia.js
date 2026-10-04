export const GANANCIA_TIPOS = ['ninguna', 'porcentaje', 'por_persona'];

/** Normaliza y valida la configuración de ganancia recibida del cliente. */
export const normalizarGanancia = ({ gananciaTipo, gananciaValor }) => {
  const tipo = GANANCIA_TIPOS.includes(gananciaTipo) ? gananciaTipo : 'ninguna';
  let valor = Math.max(0, Number(gananciaValor) || 0);
  if (tipo === 'porcentaje') valor = Math.min(100, valor);
  if (tipo === 'ninguna') valor = 0;
  return { gananciaTipo: tipo, gananciaValor: valor };
};
