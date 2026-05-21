import React from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import HabitacionCard from './HabitacionCard';
import { filtrarHabitaciones } from '../../utils/calculos';
import styles from '../styles/components/habitaciones.module.css';

const HabitacionesList = () => {
  const { state } = useHabitacionesContext();
  const habitacionesFiltradas = filtrarHabitaciones(state.habitaciones, state.filtros);

  if (!habitacionesFiltradas.length) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🏨</div>
        <p className={styles.emptyText}>No hay habitaciones registradas o no se encontraron coincidencias.</p>
      </div>
    );
  }

  return (
    <main className={styles.container} aria-live="polite">
      {habitacionesFiltradas.map((habitacion) => (
        <HabitacionCard key={habitacion.id} habitacion={habitacion} />
      ))}
    </main>
  );
};

export default HabitacionesList;
