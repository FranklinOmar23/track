import React, { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../context/HabitacionesContext';
import { formatCurrency, MESES } from '../../utils/formatters';
import styles from '../styles/components/modals.module.css';

const ModalRegistrarPago = ({ habId, perIdx, persona, onClose }) => {
  const { state, registrarPago } = useHabitacionesContext();
  const [mes, setMes] = useState('');
  const [monto, setMonto] = useState('');
  
  const habitacion = state.habitaciones.find(hab => hab.id === habId);
  
  useEffect(() => {
    const fechaActual = new Date();
    setMes(MESES[fechaActual.getMonth()]);
    
    // Calcular pendiente
    const cantidadPersonas = habitacion.personas.filter(p => p.n).length;
    const cuotaIdeal = Math.round(habitacion.total / cantidadPersonas);
    const pagadoPersona = persona.pagos.reduce((sum, pago) => sum + pago.monto, 0);
    const pendiente = Math.max(0, cuotaIdeal - pagadoPersona);
    setMonto(pendiente);
  }, []);
  
  const handleSubmit = () => {
    if (!monto) return;
    registrarPago(habId, perIdx, { mes, monto: parseFloat(monto) });
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
          <button className="button-primary" onClick={handleSubmit}>Guardar ↗</button>
        </div>
      </div>
    </div>
  );
};

export default ModalRegistrarPago;