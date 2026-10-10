/** URL de la vista de un viaje: /resort/<slug> o /tour/<slug>. */
export const rutaViaje = (viaje) => {
  const tipo = viaje.tipo === 'tour' ? 'tour' : 'resort';
  return `/${tipo}/${viaje.slug || viaje.nombre.toLowerCase().replace(/ /g, '-')}`;
};
