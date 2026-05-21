import React, { useState } from 'react';
import styles from '../styles/components/modals.module.css';

const ModalAgregarViaje = ({ open, onClose, onCreate }) => {
  const [nombre, setNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [nota, setNota] = useState('');

  const handleSubmit = () => {
    if (!nombre.trim()) return;
    onCreate({ nombre: nombre.trim(), fechaInicio: fechaInicio || null, fechaFin: fechaFin || null, nota: nota || '' });
    setNombre('');
    setFechaInicio('');
    setFechaFin('');
    setNota('');
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo viaje</h3>

        <div className={styles.formRow}>
          <label>Nombre del viaje</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Viaje enero"
          />
        </div>

        <div className={styles.formRow}>
          <label>Fecha inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div className={styles.formRow}>
          <label>Fecha fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        <div className={styles.formRow}>
          <label>Notas</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className={styles.modalActions}>
          <button className="button" onClick={onClose}>Cancelar</button>
          <button className="button-primary" type="button" onClick={handleSubmit}>Crear viaje</button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarViaje;
