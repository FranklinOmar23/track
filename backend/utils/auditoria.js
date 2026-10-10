// Contexto legible y "fotos" del estado previo, para que el registro de actividad
// diga a quién y cuánto (no solo IDs) y permita deshacer acciones.

const DIVISA_SIMBOLO = { USD: 'US$', DOP: 'RD$', EUR: '€', MXN: 'MX$', COP: 'COL$' };

export const fmtMonto = (monto, divisa = 'USD') =>
  `${DIVISA_SIMBOLO[divisa] || `${divisa} `}${Number(monto || 0).toLocaleString('es-DO', { maximumFractionDigits: 2 })}`;

/** "Juan Pérez (Hab. 12 · Resort X)" + divisa del viaje. */
export const contextoPersona = async (conn, personaId) => {
  const [rows] = await conn.query(`
    SELECT p.nombre, h.id AS habitacion_id, h.numero, v.nombre AS viaje, COALESCE(v.divisa, 'USD') AS divisa
    FROM personas p
    JOIN habitaciones h ON h.id = p.habitacion_id
    LEFT JOIN viajes v ON v.id = h.viaje_id
    WHERE p.id = ?`, [personaId]);
  const r = rows[0];
  if (!r) return { texto: `persona ${personaId}`, divisa: 'USD' };
  return {
    texto: `${r.nombre} (Hab. ${r.numero}${r.viaje ? ` · ${r.viaje}` : ''})`,
    divisa: r.divisa,
    habitacionId: r.habitacion_id,
  };
};

/** "Hab. 12 · Resort X". */
export const contextoHabitacion = async (conn, habitacionId) => {
  const [rows] = await conn.query(`
    SELECT h.numero, v.nombre AS viaje FROM habitaciones h
    LEFT JOIN viajes v ON v.id = h.viaje_id WHERE h.id = ?`, [habitacionId]);
  const r = rows[0];
  if (!r) return `habitación ${habitacionId}`;
  return `Hab. ${r.numero}${r.viaje ? ` · ${r.viaje}` : ''}`;
};

export const fotoPago = async (conn, pagoId) => {
  const [rows] = await conn.query(
    'SELECT id, persona_id, mes, anio, monto, created_at FROM pagos WHERE id = ?', [pagoId]);
  if (!rows[0]) return null;
  return { ...rows[0], monto: Number(rows[0].monto) };
};

export const fotoPersona = async (conn, personaId) => {
  const [rows] = await conn.query(
    'SELECT id, habitacion_id, nombre, posicion, es_nino, COALESCE(es_gratis, 0) AS es_gratis FROM personas WHERE id = ?',
    [personaId]);
  if (!rows[0]) return null;
  const [pagos] = await conn.query(
    'SELECT id, persona_id, mes, anio, monto, created_at FROM pagos WHERE persona_id = ?', [personaId]);
  return { persona: rows[0], pagos: pagos.map((p) => ({ ...p, monto: Number(p.monto) })) };
};

export const fotoHabitacion = async (conn, habitacionId) => {
  const [rows] = await conn.query(
    'SELECT id, numero, tipo, total, precio_nino, es_stack, nota, etiqueta, viaje_id FROM habitaciones WHERE id = ?',
    [habitacionId]);
  if (!rows[0]) return null;
  const [personas] = await conn.query(
    'SELECT id, habitacion_id, nombre, posicion, es_nino, COALESCE(es_gratis, 0) AS es_gratis FROM personas WHERE habitacion_id = ?',
    [habitacionId]);
  const ids = personas.map((p) => p.id);
  const [pagos] = ids.length
    ? await conn.query('SELECT id, persona_id, mes, anio, monto, created_at FROM pagos WHERE persona_id IN (?)', [ids])
    : [[]];
  return {
    habitacion: { ...rows[0], total: Number(rows[0].total), precio_nino: Number(rows[0].precio_nino) },
    personas,
    pagos: pagos.map((p) => ({ ...p, monto: Number(p.monto) })),
  };
};
