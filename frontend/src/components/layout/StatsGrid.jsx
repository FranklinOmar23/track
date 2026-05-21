import React from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { calcularEstadisticas, calcularTotalPagado } from '../../utils/calculos';
import styles from '../styles/components/stats.module.css';

const StatsGrid = () => {
  const { state } = useHabitacionesContext();
  const { total, pagado, pendiente } = calcularEstadisticas(state.habitaciones);
  const habitaciones = state.habitaciones.length;
  const stackCount = state.habitaciones.filter(hab => hab.stack).length;
  const completas = state.habitaciones.filter(hab => hab.stack || calcularTotalPagado(hab) >= hab.total).length;

  return (
    <section className={styles.statsGrid} aria-label="Estadísticas de pagos">
      <article className={styles.statCard}>
        <span className={styles.statLabel}>Total por cobrar</span>
        <span className={styles.statValue}>{total ? `$${Math.round(total).toLocaleString('es-DO')}` : '$0'}</span>
      </article>
      <article className={styles.statCard}>
        <span className={styles.statLabel}>Recaudado</span>
        <span className={`${styles.statValue} ${styles.statValueGreen}`}>{pagado ? `$${Math.round(pagado).toLocaleString('es-DO')}` : '$0'}</span>
      </article>
      <article className={styles.statCard}>
        <span className={styles.statLabel}>Pendiente</span>
        <span className={`${styles.statValue} ${styles.statValueRed}`}>{pendiente ? `$${Math.round(pendiente).toLocaleString('es-DO')}` : '$0'}</span>
      </article>
      <article className={styles.statCard}>
        <span className={styles.statLabel}>Habitaciones</span>
        <span className={styles.statValue}>{habitaciones}</span>
      </article>
      <article className={styles.statCard}>
        <span className={styles.statLabel}>STACK</span>
        <span className={`${styles.statValue} ${styles.statValuePurple}`}>{stackCount}</span>
      </article>
      <article className={styles.statCard}>
        <span className={styles.statLabel}>Completadas</span>
        <span className={`${styles.statValue} ${styles.statValueGreen}`}>{completas}</span>
      </article>
    </section>
  );
};

export default StatsGrid;
