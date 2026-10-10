import { asyncRouter } from '../utils/asyncRouter.js';
import pool from '../db.js';
import { capacidadPorTipo, contarAdultos, ajustarTipoPorAdultos } from '../utils/habitacion.js';
import { movimientoAbierto } from '../utils/viajeCerrado.js';
import { registrarLog } from '../utils/log.js';

const router = asyncRouter();

router.post('/', movimientoAbierto, async (req, res) => {
  const { personaId, destinoHabitacionId } = req.body;

  if (!personaId || !destinoHabitacionId) {
    return res.status(400).json({ error: 'personaId y destinoHabitacionId son requeridos.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [personaRows] = await connection.query('SELECT habitacion_id FROM personas WHERE id = ?', [personaId]);
    if (!personaRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    const habitacionOrigenId = personaRows[0].habitacion_id;
    const [destHabRows] = await connection.query('SELECT tipo FROM habitaciones WHERE id = ?', [destinoHabitacionId]);
    if (!destHabRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Habitación de destino no encontrada.' });
    }

    const destTipoActual = destHabRows[0].tipo;
    const capacidadActual = capacidadPorTipo(destTipoActual);

    const ocupadosDestino = await contarAdultos(connection, destinoHabitacionId);

    if (ocupadosDestino > capacidadActual) {
      await connection.rollback();
      return res.status(400).json({ error: 'La habitación destino no tiene espacio disponible.' });
    }

    const [ultimaPos] = await connection.query(
      'SELECT IFNULL(MAX(posicion), 0) AS maxPos FROM personas WHERE habitacion_id = ?',
      [destinoHabitacionId]
    );

    const nuevaPosicion = ultimaPos[0].maxPos + 1;

    await connection.query(
      'UPDATE personas SET habitacion_id = ?, posicion = ? WHERE id = ?',
      [destinoHabitacionId, nuevaPosicion, personaId]
    );

    await connection.query(
      'INSERT INTO historial_movimientos (persona_id, habitacion_origen_id, habitacion_destino_id) VALUES (?, ?, ?)',
      [personaId, habitacionOrigenId, destinoHabitacionId]
    );

    // Ajustar el tipo de ambas habitaciones según sus adultos
    await ajustarTipoPorAdultos(connection, destinoHabitacionId);
    await ajustarTipoPorAdultos(connection, habitacionOrigenId);

    await connection.commit();
    registrarLog(req.usuario, 'mover', 'movimiento', personaId, `${req.usuario} movió a la persona ${personaId} a la habitación ${destinoHabitacionId}`);
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
