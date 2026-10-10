const CAPACIDAD_POR_TIPO = { Single: 1, Doble: 2, Triple: 3 };

/** Cantidad de personas que caben según el tipo de habitación. */
export const capacidadPorTipo = (tipo) => CAPACIDAD_POR_TIPO[tipo] ?? 2;

/** Tipo de habitación que corresponde a una ocupación (1 → Single, 2 → Doble, 3+ → Triple). */
export const tipoPorOcupacion = (ocupados) => (ocupados <= 1 ? 'Single' : ocupados === 2 ? 'Doble' : 'Triple');

// Adultos = personas con nombre que no son niños (ni marcados como niño ni con "(N años)" en el nombre).
// El tipo de habitación (Single/Doble/Triple) se basa solo en adultos; los niños no ocupan cupo.
const SQL_CONTAR_ADULTOS = `
  SELECT COUNT(*) AS total FROM personas
  WHERE habitacion_id = ? AND nombre IS NOT NULL AND nombre != ''
    AND COALESCE(es_nino, 0) = 0
    AND nombre NOT LIKE '%(%año)%' AND nombre NOT LIKE '%(%años)%'`;

export const contarAdultos = async (conn, habitacionId) => {
  const [rows] = await conn.query(SQL_CONTAR_ADULTOS, [habitacionId]);
  return Number(rows[0].total) || 0;
};

/** Ajusta el tipo de la habitación a su cantidad de adultos (no la toca si queda sin adultos). */
export const ajustarTipoPorAdultos = async (conn, habitacionId) => {
  const adultos = await contarAdultos(conn, habitacionId);
  if (adultos === 0) return;
  const tipo = tipoPorOcupacion(adultos);
  await conn.query('UPDATE habitaciones SET tipo = ? WHERE id = ? AND tipo <> ?', [tipo, habitacionId, tipo]);
};
