const CAPACIDAD_POR_TIPO = { Single: 1, Doble: 2, Triple: 3 };

/** Cantidad de personas que caben según el tipo de habitación. */
export const capacidadPorTipo = (tipo) => CAPACIDAD_POR_TIPO[tipo] ?? 2;

/** Tipo de habitación que corresponde a una ocupación (1 → Single, 2 → Doble, 3+ → Triple). */
export const tipoPorOcupacion = (ocupados) => (ocupados <= 1 ? 'Single' : ocupados === 2 ? 'Doble' : 'Triple');
