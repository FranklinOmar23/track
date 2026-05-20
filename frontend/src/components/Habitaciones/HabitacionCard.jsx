import React from 'react';
import HabitacionHeader from './HabitacionHeader';
import HabitacionBody from './HabitacionBody';
import { useHabitacionesContext } from '../../context/HabitacionesContext';
import styles from '../styles/components/habitaciones.module.css';

const HabitacionCard = ({ habitacion }) => {
  const { state, toggleExpanded } = useHabitacionesContext();
  const isExpanded = state.expandedHabs[habitacion.id] || false;
  
  return (
    <article className={styles.habCard}>
      <HabitacionHeader 
        habitacion={habitacion}
        isExpanded={isExpanded}
        onToggle={() => toggleExpanded(habitacion.id)}
      />
      {isExpanded && <HabitacionBody habitacion={habitacion} />}
    </article>
  );
};

export default HabitacionCard;