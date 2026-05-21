import React, { useEffect, useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';

const ModalMoverPersona = ({ habOrigen, perIdx, persona, onClose }) => {
  const { state, moverPersona } = useHabitacionesContext();
  const destinos = state.habitaciones.filter((hab) => {
    if (hab.id === habOrigen) return false;
    const ocupados = hab.personas.filter((p) => p.n).length;
    const capacidad = hab.tipo === 'Triple' ? 3 : hab.tipo === 'Single' ? 1 : 2;
    return ocupados <= capacidad;
  });

  const [destinoSeleccionado, setDestinoSeleccionado] = useState(destinos[0]?.id || '');

  useEffect(() => {
    setDestinoSeleccionado(destinos[0]?.id || '');
  }, [destinos]);

  const handleMover = () => {
    if (!destinoSeleccionado) return;
    moverPersona(habOrigen, parseInt(destinoSeleccionado, 10), perIdx);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h3 className={styles.modalTitulo}>Mover persona — {persona.n || '(sin nombre)'}</h3>
        {destinos.length === 0 ? (
          <div className={styles.modalMoverInfo}>
            No hay habitaciones disponibles con espacio suficiente para mover a esta persona.
          </div>
        ) : (
          <>
            <div className={styles.formRow}>
              <label htmlFor="destHab">Destino</label>
              <select id="destHab" value={destinoSeleccionado} onChange={(event) => setDestinoSeleccionado(event.target.value)}>
                {destinos.map((hab) => {
                  const ocupados = hab.personas.filter((p) => p.n).length;
                  const capacidad = hab.tipo === 'Triple' ? 3 : hab.tipo === 'Single' ? 1 : 2;
                  const llena = ocupados >= capacidad;
                  const label = llena ? `Hab ${hab.num} (${hab.tipo} → será ${hab.tipo === 'Single' ? 'Doble' : 'Triple'})` : `Hab ${hab.num} (${hab.tipo})`;
                  return (
                    <option key={hab.id} value={hab.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className="button" type="button" onClick={onClose}>Cancelar</button>
              <button className="button button-primary" type="button" onClick={handleMover} disabled={!destinoSeleccionado}>
                Mover
              </button>
            </div>
          </>
        )}
        {destinos.length === 0 && (
          <div className={styles.modalActions}>
            <button className="button" type="button" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalMoverPersona;
