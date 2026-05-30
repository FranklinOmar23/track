import React, { useEffect, useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';

const ModalAgregarHabitacion = ({ open, onClose }) => {
  const { agregarHabitacion, state } = useHabitacionesContext();
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState('Single');
  const [persona1, setPersona1] = useState('');
  const [persona2, setPersona2] = useState('');
  const [persona3, setPersona3] = useState('');
  const [total, setTotal] = useState('');
  const [precioNino, setPrecioNino] = useState('');
  const [stackActivo, setStackActivo] = useState(false);
  const [etiqueta, setEtiqueta] = useState('');
  const [etiquetaPersonalizada, setEtiquetaPersonalizada] = useState('');

  // Obtener etiquetas existentes en el viaje actual para sugerirlas
  const etiquetasExistentes = [...new Set(
    state.habitaciones
      .map((h) => h.etiqueta)
      .filter(Boolean)
  )].sort();

  useEffect(() => {
    if (!open) {
      setNumero('');
      setTipo('Single');
      setPersona1('');
      setPersona2('');
      setPersona3('');
      setTotal('');
      setPrecioNino('');
      setStackActivo(false);
      setEtiqueta('');
      setEtiquetaPersonalizada('');
    }
  }, [open]);

  if (!open) return null;

  // Etiqueta final: si eligió "nueva", usa el campo personalizado
  const etiquetaFinal = etiqueta === '__nueva__' ? etiquetaPersonalizada.trim() : etiqueta;

  const handleGuardar = () => {
    if (!numero.trim() || !persona1.trim() || (!stackActivo && !total)) {
      alert('Complete los datos obligatorios.');
      return;
    }

    const personas = [];
    if (persona1.trim()) personas.push({ n: persona1.trim(), pagos: [] });
    if (persona2.trim()) personas.push({ n: persona2.trim(), pagos: [] });
    if (tipo === 'Triple' && persona3.trim()) personas.push({ n: persona3.trim(), pagos: [] });

    agregarHabitacion({
      num: numero.trim(),
      tipo,
      total: stackActivo ? 0 : parseFloat(total) || 0,
      precioNino: stackActivo ? 0 : parseFloat(precioNino) || 0,
      stack: stackActivo,
      nota: '',
      etiqueta: etiquetaFinal,
      personas,
    });

    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h3 className={styles.modalTitulo}>Nueva habitación</h3>

        <div className={styles.formRow}>
          <label htmlFor="mHabNum">Número / ID</label>
          <input
            id="mHabNum"
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Ej: 101"
          />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mTipo">Tipo</label>
          <select id="mTipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option>Single</option>
            <option>Doble</option>
            <option>Triple</option>
          </select>
        </div>

        {/* Etiqueta / Centro */}
        <div className={styles.formRow}>
          <label htmlFor="mEtiqueta">Centro / Etiqueta</label>
          <select
            id="mEtiqueta"
            value={etiqueta}
            onChange={(e) => {
              setEtiqueta(e.target.value);
              if (e.target.value !== '__nueva__') setEtiquetaPersonalizada('');
            }}
          >
            <option value="">Sin etiqueta</option>
            {etiquetasExistentes.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
            <option value="__nueva__">+ Nueva etiqueta...</option>
          </select>
        </div>

        {etiqueta === '__nueva__' && (
          <div className={styles.formRow}>
            <label htmlFor="mEtiquetaNueva">Nombre de la etiqueta</label>
            <input
              id="mEtiquetaNueva"
              type="text"
              value={etiquetaPersonalizada}
              onChange={(e) => setEtiquetaPersonalizada(e.target.value)}
              placeholder="Ej: Centro Nueva Isabela"
              autoFocus
            />
          </div>
        )}

        <div className={styles.formRow}>
          <label htmlFor="mP1">Persona 1</label>
          <input
            id="mP1"
            type="text"
            value={persona1}
            onChange={(e) => setPersona1(e.target.value)}
            placeholder="Nombre completo"
          />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mP2">
            Persona 2{' '}
            {tipo !== 'Single' && <span style={{ fontSize: '0.85em', color: '#666' }}>(opcional)</span>}
          </label>
          <input
            id="mP2"
            type="text"
            value={persona2}
            onChange={(e) => setPersona2(e.target.value)}
            placeholder="Nombre completo"
          />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mP3">
            Persona 3{' '}
            {tipo === 'Triple' && <span style={{ fontSize: '0.85em', color: '#666' }}>(opcional)</span>}
          </label>
          <input
            id="mP3"
            type="text"
            value={persona3}
            onChange={(e) => setPersona3(e.target.value)}
            placeholder="Nombre completo"
            disabled={tipo !== 'Triple'}
          />
        </div>

        <div className={`${styles.formRow} ${styles.stackToggle}`}>
          <button
            type="button"
            className={stackActivo ? 'button button-primary' : 'button'}
            onClick={() => setStackActivo(!stackActivo)}
          >
            STACK
          </button>
          <span className={`${styles.stackLabel} ${stackActivo ? styles.stackLabelActive : ''}`}>
            {stackActivo ? 'Habitación stack (no paga)' : 'Habitación normal'}
          </span>
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mTotal">Total habitación ($)</label>
          <input
            id="mTotal"
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="27700"
            disabled={stackActivo}
          />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mPrecioNino">Precio por niño ($)</label>
          <input
            id="mPrecioNino"
            type="number"
            value={precioNino}
            onChange={(e) => setPrecioNino(e.target.value)}
            placeholder="0"
            disabled={stackActivo}
          />
        </div>

        <div className={styles.modalActions}>
          <button className="button" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="button" onClick={handleGuardar}>
            Guardar ↗
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarHabitacion;