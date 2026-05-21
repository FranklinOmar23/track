import React, { useState } from 'react';
import styles from '../styles/components/modals.module.css';

const ModalAgregarViaje = ({ open, onClose, onCreate }) => {
  const [nombre, setNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [nota, setNota] = useState('');
  const [tipo, setTipo] = useState('resort');
  const [capacidad, setCapacidad] = useState('');

  const handleSubmit = () => {
    if (!nombre.trim()) return;
    if (tipo === 'tour' && !capacidad) {
      alert('Ingresa la capacidad de asientos para tours');
      return;
    }
    onCreate({
      nombre: nombre.trim(),
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      nota: nota || '',
      tipo,
      capacidad: tipo === 'tour' ? parseInt(capacidad, 10) : null,
    });
    setNombre('');
    setFechaInicio('');
    setFechaFin('');
    setNota('');
    setTipo('resort');
    setCapacidad('');
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo viaje</h3>

        <div className={styles.formRow}>
          <label>Tipo de viaje</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tipo"
                value="resort"
                checked={tipo === 'resort'}
                onChange={(e) => setTipo(e.target.value)}
              />
              🏨 Resort (habitaciones)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tipo"
                value="tour"
                checked={tipo === 'tour'}
                onChange={(e) => setTipo(e.target.value)}
              />
              🚐 Tour (asientos)
            </label>
          </div>
        </div>

        <div className={styles.formRow}>
          <label>Nombre del viaje</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Viaje enero"
          />
        </div>

        {tipo === 'tour' && (
          <div className={styles.formRow}>
            <label>Total de asientos</label>
            <input
              type="number"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              placeholder="Ej. 30"
              min="1"
            />
          </div>
        )}

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
          <button className="button button-primary" type="button" onClick={handleSubmit}>Crear viaje</button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarViaje;
