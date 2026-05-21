import React, { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { MESES } from '../../utils/formatters';
import styles from '../styles/components/modals.module.css';

const ModalRegistrarPago = ({ habId, perIdx, persona, pago = null, onClose }) => {
  const { state, registrarPago, actualizarPago, eliminarPago } = useHabitacionesContext();
  const [mes, setMes] = useState('');
  const [monto, setMonto] = useState('');

  const habitacion = state.habitaciones.find((hab) => hab.id === habId);

  useEffect(() => {
    if (pago) {
      setMes(pago.mes);
      setMonto(pago.monto);
      return;
    }

    const fechaActual = new Date();
    setMes(MESES[fechaActual.getMonth()]);

    const cantidadPersonas = habitacion.personas.filter((p) => p.n).length;
    const cuotaIdeal = Math.round(habitacion.total / cantidadPersonas);
    const pagadoPersona = persona.pagos.reduce((sum, pagoItem) => sum + pagoItem.monto, 0);
    const pendiente = Math.max(0, cuotaIdeal - pagadoPersona);
    setMonto(pendiente);
  }, [habitacion, pago, persona.pagos]);

  const handleSubmit = () => {
    if (!mes || !monto) return;

    const pagoData = { mes, monto: parseFloat(monto) };

    if (pago?.id) {
      actualizarPago(habId, perIdx, pago.id, pagoData);
    } else {
      registrarPago(habId, perIdx, pagoData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (!pago?.id) return;
    eliminarPago(habId, perIdx, pago.id);
    onClose();
  };
  
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>Registrar pago — {persona.n}</h3>
        <div className={styles.formRow}>
          <label>Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)}>
            {MESES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className={styles.formRow}>
          <label>Monto ($)</label>
          <input 
            type="number" 
            value={monto} 
            onChange={e => setMonto(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className={styles.modalActions}>
          <button className="button" onClick={onClose}>Cancelar</button>
          {pago?.id && (
            <button className="button button-danger" onClick={handleDelete} style={{ marginLeft: '0.5rem' }}>
              Eliminar
            </button>
          )}
          <button className="button-primary" onClick={handleSubmit} style={{ marginLeft: '0.5rem' }}>Guardar ↗</button>
        </div>
      </div>
    </div>
  );
};

export default ModalRegistrarPago;