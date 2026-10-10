import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { cuotasHabitacion } from '../utils/totales.js';

const router = asyncRouter();

// Obtener viaje por token (vista pública) - VERIFICAR EXPIRACIÓN
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Verificar si existe (activo o no)
    const [todosViajes] = await pool.query(
      `SELECT id, nombre, tipo, COALESCE(divisa, 'USD') as divisa, fecha_inicio, fecha_fin, nota, slug,
              expira_compartir, compartir_activo, COALESCE(tipo_compartir, 'completo') AS tipo_compartir,
              COALESCE(edad_minima_pago, 0) AS edad_minima_pago,
              (expira_compartir IS NOT NULL AND expira_compartir <= UTC_TIMESTAMP()) AS ya_expiro
       FROM viajes
       WHERE token_compartir = ?`,
      [token]
    );

    if (todosViajes.length === 0) {
      return res.status(404).json({ error: 'Link inválido' });
    }

    const viaje = todosViajes[0];

    if (!viaje.compartir_activo) {
      return res.status(404).json({ error: 'Link desactivado' });
    }

    if (viaje.ya_expiro) {
      return res.status(410).json({
        error: 'expired',
        mensaje: 'Este enlace ha expirado',
        expiracion: viaje.expira_compartir
      });
    }

    const viajeId = viaje.id;

    // Obtener habitaciones con personas y pagos
    const [habitaciones] = await pool.query(`
      SELECT
        h.id, h.numero, h.tipo, h.total, h.precio_nino, h.es_stack, h.nota, h.etiqueta,
        p.id as persona_id, p.nombre as persona_nombre, p.posicion, p.es_nino, p.es_gratis,
        pag.id as pago_id, pag.mes, COALESCE(pag.anio, YEAR(pag.created_at)) AS anio, pag.monto
      FROM habitaciones h
      LEFT JOIN personas p ON p.habitacion_id = h.id
      LEFT JOIN pagos pag ON pag.persona_id = p.id
      WHERE h.viaje_id = ?
      ORDER BY h.etiqueta, CAST(h.numero AS UNSIGNED), p.posicion
    `, [viajeId]);

    // Agrupar por habitación
    const habitacionesMap = new Map();
    habitaciones.forEach(row => {
      if (!habitacionesMap.has(row.id)) {
        habitacionesMap.set(row.id, {
          id: row.id,
          num: row.numero,
          tipo: row.tipo,
          total: Number(row.total),
          precioNino: Number(row.precio_nino),
          edadMinimaPago: Number(viaje.edad_minima_pago) || 0,
          stack: !!row.es_stack,
          nota: row.nota || '',
          etiqueta: row.etiqueta || '',
          personas: []
        });
      }

      const hab = habitacionesMap.get(row.id);
      if (row.persona_id) {
        let persona = hab.personas.find(p => p.id === row.persona_id);
        if (!persona) {
          persona = {
            id: row.persona_id,
            n: row.persona_nombre,
            posicion: row.posicion,
            esNino: !!row.es_nino,
            esGratis: !!row.es_gratis,
            pagos: []
          };
          hab.personas.push(persona);
        }
        if (row.pago_id) {
          persona.pagos.push({
            id: row.pago_id,
            mes: row.mes,
            anio: row.anio,
            monto: Number(row.monto)
          });
        }
      }
    });

    let habitacionesRespuesta = Array.from(habitacionesMap.values());

    // "Solo pendientes": filtrar en el servidor para no exponer a quienes ya pagaron
    if (viaje.tipo_compartir === 'pendientes') {
      habitacionesRespuesta = habitacionesRespuesta
        .map((hab) => {
          const cuotas = cuotasHabitacion({
            total: hab.total,
            precioNino: hab.precioNino,
            personas: hab.personas.map((p) => ({
              id: p.id, nombre: p.n, esNino: p.esNino, esGratis: p.esGratis,
            })),
          }, viaje.edad_minima_pago);
          const pendientes = new Set(
            cuotas
              .filter((c) => {
                const persona = hab.personas.find((p) => p.id === c.id);
                const pagado = persona.pagos.reduce((s, pg) => s + pg.monto, 0);
                return c.cuota - pagado > 0;
              })
              .map((c) => c.id)
          );
          return { ...hab, personas: hab.personas.filter((p) => pendientes.has(p.id)) };
        })
        .filter((hab) => hab.personas.length > 0);
    }

    res.json({
      viaje: {
        id: viaje.id,
        nombre: viaje.nombre,
        tipo: viaje.tipo,
        divisa: viaje.divisa || 'USD',
        expiraCompartir: viaje.expira_compartir,
        tipoCompartir: viaje.tipo_compartir || 'completo'
      },
      habitaciones: habitacionesRespuesta
    });
  } catch (error) {
    console.error('Error obteniendo viaje público:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
