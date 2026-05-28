import React, { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { MESES } from '../../utils/formatters';
import styles from '../styles/components/modals.module.css';

const ModalRegistrarPago = ({ habId, perIdx, persona, pago = null, onClose }) => {
  const { state, registrarPago, actualizarPago, eliminarPago } = useHabitacionesContext();
  const [mes, setMes] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);

  const habitacion = state.habitaciones.find((hab) => hab.id === habId);

  useEffect(() => {
    if (pago) {
      setMes(pago.mes);
      setMonto(pago.monto);
      return;
    }

    const fechaActual = new Date();
    setMes(MESES[fechaActual.getMonth()]);

    if (habitacion && !habitacion.stack && habitacion.total > 0) {
      const cantidadPersonas = habitacion.personas.filter((p) => p.n).length;
      const cuotaIdeal = Math.round(habitacion.total / cantidadPersonas);
      const pagadoPersona = persona.pagos.reduce((sum, pagoItem) => sum + pagoItem.monto, 0);
      const pendiente = Math.max(0, cuotaIdeal - pagadoPersona);
      setMonto(pendiente);
    }
  }, [habitacion, pago, persona.pagos]);

  const handleSubmit = async () => {
    if (!mes || !monto) return;
    setLoading(true);
    const pagoData = { mes, monto: parseFloat(monto) };
    try {
      if (pago?.id) {
        await actualizarPago(habId, perIdx, pago.id, pagoData);
      } else {
        await registrarPago(habId, perIdx, pagoData);
      }
      onClose();
    } catch (error) {
      console.error('Error guardando pago:', error);
      alert('Error al guardar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pago?.id) return;
    setLoading(true);
    try {
      await eliminarPago(habId, perIdx, pago.id);
      onClose();
    } catch (error) {
      console.error('Error eliminando pago:', error);
      alert('Error al eliminar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Registrar pago — {persona.n}</h3>
        <div className={styles.formRow}>
          <label>Mes</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)} disabled={loading}>
            {MESES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className={styles.formRow}>
          <label>Monto ($)</label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            disabled={loading}
          />
        </div>
        <div className={styles.modalActions}>
          <button type="button" className="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          {pago?.id && (
            <button type="button" className="button button-danger" onClick={handleDelete} disabled={loading}>
              Eliminar
            </button>
          )}
          <button type="button" className="button-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar ↗'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalRegistrarPago;