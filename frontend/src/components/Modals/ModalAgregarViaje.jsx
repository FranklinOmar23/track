import React, { useState } from 'react';
import { crearViajeConSlug } from '../../utils/api';
import styles from '../styles/components/modals.module.css';

const ModalAgregarViaje = ({ open, onClose, onCreate }) => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('resort');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    try {
      const nuevoViaje = await crearViajeConSlug({
        nombre: nombre.trim(),
        tipo,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        nota: nota || null
      });
      onCreate(nuevoViaje);
      setNombre('');
      setTipo('resort');
      setFechaInicio('');
      setFechaFin('');
      setNota('');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al crear el viaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Crear nuevo viaje</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label>Nombre del viaje *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Tour Buggie Punta Cana"
              required
              autoFocus
            />
          </div>

          <div className={styles.formRow}>
            <label>Tipo de viaje</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="resort">🏨 Resort</option>
              <option value="tour">🚐 Tour</option>
            </select>
          </div>

          <div className={styles.formRowDouble}>
            <div>
              <label>Fecha inicio</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label>Fecha fin</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>

          <div className={styles.formRow}>
            <label>Nota (opcional)</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Información adicional..."
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.buttonSecondary} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.buttonPrimary} disabled={loading}>
              {loading ? 'Creando...' : 'Crear viaje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAgregarViaje;