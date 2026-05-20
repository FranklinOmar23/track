import React from 'react';
import ProgressBar from '../common/ProgressBar';
import { calcularPorcentaje } from '../../utils/calculos';
import styles from '../styles/components/habitaciones.module.css';

const HabitacionHeader = ({ habitacion, isExpanded, onToggle }) => {
  const porcentaje = habitacion.stack ? 100 : calcularPorcentaje(habitacion);
  const nombres = habitacion.personas.filter((persona) => persona.n).map((persona) => persona.n).join(' & ');
  const estado = habitacion.stack ? 'STACK' : porcentaje >= 100 ? 'Pagado' : 'Pendiente';
  const badgeClass = habitacion.stack ? styles.badgeStack : porcentaje >= 100 ? styles.badgeOk : styles.badgePend;

  return (
    <button type="button" className={styles.habHeader} onClick={onToggle} aria-expanded={isExpanded}>
      <span className={styles.habNum}>Hab {habitacion.num}</span>
      <span className={styles.habTipo}>{habitacion.tipo}</span>
      <span className={styles.habNombre}>{nombres || '(sin nombre)'}</span>
      <ProgressBar percentage={porcentaje} />
      <span className={`${styles.badge} ${badgeClass}`}>{estado}</span>
      <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`} aria-hidden="true">⌄</span>
    </button>
  );
};

export default HabitacionHeader;
