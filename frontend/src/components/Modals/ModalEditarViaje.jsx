import React, { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';

const DIVISAS = [
  { code: 'USD', label: 'USD — Dólar americano', symbol: '$' },
  { code: 'DOP', label: 'DOP — Peso dominicano', symbol: 'RD$' },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { code: 'MXN', label: 'MXN — Peso mexicano', symbol: '$' },
  { code: 'COP', label: 'COP — Peso colombiano', symbol: '$' },
];

const ModalEditarViaje = ({ viaje, open, onClose }) => {
  const { editarViaje, eliminarViaje } = useHabitacionesContext();
  const [nombre, setNombre]       = useState('');
  const [tipo, setTipo]           = useState('resort');
  const [divisa, setDivisa]       = useState('USD');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]   = useState('');
  const [nota, setNota]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (viaje && open) {
      setNombre(viaje.nombre || '');
      setTipo(viaje.tipo || 'resort');
      setDivisa(viaje.divisa || 'USD');
      setFechaInicio(viaje.fechaInicio ? viaje.fechaInicio.slice(0, 10) : '');
      setFechaFin(viaje.fechaFin ? viaje.fechaFin.slice(0, 10) : '');
      setNota(viaje.nota || '');
      setConfirmDelete(false);
    }
  }, [viaje, open]);

  if (!open || !viaje) return null;

  const handleGuardar = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      await editarViaje(viaje.id, {
        nombre: nombre.trim(),
        tipo,
        divisa,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        nota: nota || null,
      });
      onClose();
    } catch (err) {
      alert('Error al guardar el viaje');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    try {
      await eliminarViaje(viaje.id);
      onClose();
    } catch (err) {
      alert('Error al eliminar el viaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Editar viaje</h2>
          <button className={styles.closeBtn} type="button" onClick={onClose}>×</button>
        </div>

        <div className={styles.formRow}>
          <label>Nombre del viaje *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Resort MamaTingo"
            disabled={loading}
          />
        </div>

        <div className={styles.formRow}>
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={loading}>
            <option value="resort">🏨 Resort</option>
            <option value="tour">🚐 Tour</option>
          </select>
        </div>

        <div className={styles.formRow}>
          <label>Divisa</label>
          <select value={divisa} onChange={(e) => setDivisa(e.target.value)} disabled={loading}>
            {DIVISAS.map((d) => (
              <option key={d.code} value={d.code}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.formRowDouble}>
          <div>
            <label>Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label>Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <label>Nota (opcional)</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Información adicional..."
            disabled={loading}
          />
        </div>

        <div className={styles.modalActions}>
          {/* Botón eliminar con confirmación */}
          <button
            type="button"
            className={confirmDelete ? 'button button-danger' : 'button'}
            onClick={handleEliminar}
            disabled={loading}
          >
            {confirmDelete ? '⚠ Confirmar eliminación' : 'Eliminar viaje'}
          </button>
          {confirmDelete && (
            <button
              type="button"
              className="button"
              onClick={() => setConfirmDelete(false)}
              disabled={loading}
            >
              Cancelar
            </button>
          )}
          {!confirmDelete && (
            <>
              <button type="button" className="button" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleGuardar}
                disabled={loading || !nombre.trim()}
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalEditarViaje;