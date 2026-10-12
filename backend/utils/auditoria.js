// Contexto legible y "fotos" del estado previo, para que el registro de actividad
// diga a quién y cuánto (no solo IDs) y permita deshacer acciones.

const DIVISA_SIMBOLO = { USD: 'US$', DOP: 'RD$', EUR: '€', MXN: 'MX$', COP: 'COL$' };

export const fmtMonto = (monto, divisa = 'USD') =>
  `${DIVISA_SIMBOLO[divisa] || `${divisa} `}${Number(monto || 0).toLocaleString('es-DO', { maximumFractionDigits: 2 })}`;

/** "Juan Pérez (Hab. 12 · Resort X)" + divisa del viaje. */
export const contextoPersona = async (conn, personaId) => {
  const [rows] = await conn.query(`
    SELECT p.nombre, h.id AS habitacion_id, h.numero, v.nombre AS viaje, COALESCE(v.divisa, 'USD') AS divisa,
           COALESCE(v.estado, 'activo') AS estado
    FROM personas p
    JOIN habitaciones h ON h.id = p.habitacion_id
    LEFT JOIN viajes v ON v.id = h.viaje_id
    WHERE p.id = ?`, [personaId]);
  const r = rows[0];
  if (!r) return { texto: `persona ${personaId}`, divisa: 'USD', existe: false };
  return {
    texto: `${r.nombre} (Hab. ${r.numero}${r.viaje ? ` · ${r.viaje}` : ''})`,
    divisa: r.divisa,
    habitacionId: r.habitacion_id,
    cerrado: r.estado === 'cerrado',
    existe: true,
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
    'SELECT id, habitacion_id, nombre, posicion, es_nino, COALESCE(es_gratis, 0) AS es_gratis, COALESCE(es_stack, 0) AS es_stack FROM personas WHERE id = ?',
    [personaId]);
  if (!rows[0]) return null;
  const [pagos] = await conn.query(
    'SELECT id, persona_id, mes, anio, monto, created_at FROM pagos WHERE persona_id = ?', [personaId]);
  return { persona: rows[0], pagos: pagos.map((p) => ({ ...p, monto: Number(p.monto) })) };
};

export const fotoHabitacion = async (conn, habitacionId) => {
  // Tres consultas independientes (los pagos se buscan por habitación con JOIN): en un pool van en
  // paralelo; dentro de una transacción la conexión las ejecuta en orden de todos modos.
  const [[rows], [personas], [pagos]] = await Promise.all([
    conn.query(
      `SELECT id, numero, tipo, total, precio_nino, es_stack, nota, etiqueta, viaje_id,
              en_revision, revision_nota, revision_por, revision_at
       FROM habitaciones WHERE id = ?`, [habitacionId]),
    conn.query(
      'SELECT id, habitacion_id, nombre, posicion, es_nino, COALESCE(es_gratis, 0) AS es_gratis, COALESCE(es_stack, 0) AS es_stack FROM personas WHERE habitacion_id = ?',
      [habitacionId]),
    conn.query(
      `SELECT pg.id, pg.persona_id, pg.mes, pg.anio, pg.monto, pg.created_at
       FROM pagos pg JOIN personas p ON p.id = pg.persona_id WHERE p.habitacion_id = ?`, [habitacionId]),
  ]);
  if (!rows[0]) return null;
  return {
    habitacion: { ...rows[0], total: Number(rows[0].total), precio_nino: Number(rows[0].precio_nino) },
    personas,
    pagos: pagos.map((p) => ({ ...p, monto: Number(p.monto) })),
  };
};

/** Firma comparable del estado de una habitación (datos, personas y qué pagos tiene). */
export const firmaHabitacion = (foto) => JSON.stringify({
  h: ['numero', 'tipo', 'total', 'precio_nino', 'etiqueta', 'es_stack'].map((k) => String(foto.habitacion[k] ?? '')),
  p: [...foto.personas].sort((a, b) => a.id - b.id)
    .map((p) => [p.id, p.nombre, Number(p.es_nino), Number(p.es_gratis), Number(p.es_stack || 0)]),
  g: foto.pagos.map((p) => p.id).sort((a, b) => a - b),
});
