import React, { useEffect, useState } from 'react';
import { useHabitacionesContext } from '../../context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';

const ModalAgregarHabitacion = ({ open, onClose }) => {
  const { agregarHabitacion } = useHabitacionesContext();
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState('Doble');
  const [persona1, setPersona1] = useState('');
  const [persona2, setPersona2] = useState('');
  const [persona3, setPersona3] = useState('');
  const [total, setTotal] = useState('');
  const [precioNino, setPrecioNino] = useState('');
  const [stackActivo, setStackActivo] = useState(false);

  useEffect(() => {
    if (!open) {
      setNumero('');
      setTipo('Doble');
      setPersona1('');
      setPersona2('');
      setPersona3('');
      setTotal('');
      setPrecioNino('');
      setStackActivo(false);
    }
  }, [open]);

  if (!open) return null;

  const handleGuardar = () => {
    if (!numero.trim() || !persona1.trim() || !persona2.trim() || (!stackActivo && !total)) {
      alert('Complete los datos obligatorios.');
      return;
    }

    agregarHabitacion({
      num: numero.trim(),
      tipo,
      total: stackActivo ? 0 : parseFloat(total) || 0,
      precioNino: stackActivo ? 0 : parseFloat(precioNino) || 0,
      stack: stackActivo,
      nota: '',
      personas: [
        { n: persona1.trim(), pagos: [] },
        { n: persona2.trim(), pagos: [] },
        ...(tipo === 'Triple' ? [{ n: persona3.trim() || '', pagos: [] }] : []),
      ],
    });

    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h3 className={styles.modalTitulo}>Nueva habitación</h3>
        <div className={styles.formRow}>
          <label htmlFor="mHabNum">Número / ID</label>
          <input id="mHabNum" type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 101" />
        </div>
        <div className={styles.formRow}>
          <label htmlFor="mTipo">Tipo</label>
          <select id="mTipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option>Doble</option>
            <option>Triple</option>
          </select>
        </div>
        <div className={styles.formRow}>
          <label htmlFor="mP1">Persona 1</label>
          <input id="mP1" type="text" value={persona1} onChange={(e) => setPersona1(e.target.value)} placeholder="Nombre completo" />
        </div>
        <div className={styles.formRow}>
          <label htmlFor="mP2">Persona 2</label>
          <input id="mP2" type="text" value={persona2} onChange={(e) => setPersona2(e.target.value)} placeholder="Nombre completo" />
        </div>
        {tipo === 'Triple' && (
          <div className={styles.formRow}>
            <label htmlFor="mP3">Persona 3 (triple)</label>
            <input id="mP3" type="text" value={persona3} onChange={(e) => setPersona3(e.target.value)} placeholder="Nombre completo" />
          </div>
        )}
        <div className={`${styles.formRow} ${styles.stackToggle}`}>
          <button type="button" className={stackActivo ? 'button button-primary' : 'button'} onClick={() => setStackActivo(!stackActivo)}>
            STACK
          </button>
          <span className={`${styles.stackLabel} ${stackActivo ? styles.stackLabelActive : ''}`}>
            {stackActivo ? 'Habitación stack (no paga)' : 'Habitación normal'}
          </span>
        </div>
        <div className={styles.formRow}>
          <label htmlFor="mTotal">Total habitación ($)</label>
          <input id="mTotal" type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="27700" disabled={stackActivo} />
        </div>
        <div className={styles.formRow}>
          <label htmlFor="mPrecioNino">Precio por niño ($)</label>
          <input id="mPrecioNino" type="number" value={precioNino} onChange={(e) => setPrecioNino(e.target.value)} placeholder="0" disabled={stackActivo} />
        </div>
        <div className={styles.modalActions}>
          <button className="button" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="button" onClick={handleGuardar}>Guardar ↗</button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarHabitacion;
